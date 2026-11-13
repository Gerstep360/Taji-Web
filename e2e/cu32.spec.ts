import { expect, Page, test } from '@playwright/test';

test.use({ channel: 'msedge' });

async function setup(page: Page, permitted = true, denied = false) {
  await page.addInitScript(({ denied }) => {
    localStorage.setItem('taji.auth.has-session', '1');
    const state = window as typeof window & { cameraCalls: number; cameraStopped: boolean };
    state.cameraCalls = 0;
    state.cameraStopped = false;
    Object.defineProperty(navigator, 'mediaDevices', { value: {
      getUserMedia: async () => {
        state.cameraCalls++;
        if (denied) throw new DOMException('Denied in test', 'NotAllowedError');
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 360;
        const context = canvas.getContext('2d')!;
        const timer = setInterval(() => context.fillRect(0, 0, 640, 360), 70);
        const stream = canvas.captureStream(12);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); state.cameraStopped = true; stop(); };
        return stream;
      },
    } });
  }, { denied });
  await page.route('**/api/v1/**', async route => {
    if (route.request().url().endsWith('/auth/me/')) {
      return route.fulfill({ json: { user: {
        id: 1, email: 'demo@cu32.test', full_name: 'Guardia de prueba', is_approved: true,
        role: { slug: permitted ? 'seguridad' : 'residente', name: 'Rol de prueba',
          permissions: permitted ? ['validate_visits'] : [] },
        active_tenant: { id: 1, name: 'Condominio de prueba' },
      } } });
    }
    return route.fulfill({ json: {} });
  });
}

test('inicio manual, stop libera pista y el visor no desborda', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reconocimiento-camara');
  const start = page.getByRole('button', { name: 'Iniciar cámara' });
  await expect(start).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'cameraCalls'))).toBe(0);
  await page.screenshot({ path: '../docs/Sprint 4/pruebas/evidencias/CU32-escritorio.png', fullPage: true });
  await start.click();
  await expect(page.getByRole('button', { name: 'Detener cámara' })).toBeVisible();
  await page.getByRole('button', { name: 'Detener cámara' }).click();
  expect(await page.evaluate(() => Reflect.get(window, 'cameraStopped'))).toBe(true);
  await expect(start).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../docs/Sprint 4/pruebas/evidencias/CU32-390px.png', fullPage: true, animations: 'disabled' });
});

test('permiso denegado: explica cómo recuperar la cámara', async ({ page }) => {
  await setup(page, true, true);
  await page.goto('/reconocimiento-camara');
  await page.getByRole('button', { name: 'Iniciar cámara' }).click();
  await expect(page.getByText('Permite la cámara desde el icono de permisos del navegador.')).toBeVisible();
});

test('sin validate_visits se bloquea la ruta', async ({ page }) => {
  await setup(page, false);
  await page.goto('/reconocimiento-camara');
  await expect(page).not.toHaveURL(/reconocimiento-camara/);
  expect(await page.evaluate(() => Reflect.get(window, 'cameraCalls'))).toBe(0);
});

test('salir del módulo libera la pista sin enviar imágenes', async ({ page }) => {
  await setup(page);
  const images: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/security/cu32/')) images.push(request.url());
  });
  await page.goto('/reconocimiento-camara');
  await page.getByRole('button', { name: 'Iniciar cámara' }).click();
  await expect(page.getByRole('button', { name: 'Detener cámara' })).toBeVisible();
  await page.getByRole('link', { name: 'Inicio', exact: true }).click();
  await expect(page).not.toHaveURL(/reconocimiento-camara/);
  expect(await page.evaluate(() => Reflect.get(window, 'cameraStopped'))).toBe(true);
  expect(images).toEqual([]);
});

test('el modelo real analiza una fuente sintética sin enviar fotogramas', async ({ page }) => {
  test.setTimeout(70000);
  await setup(page);
  page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') console.log(message.text()); });
  const uploads: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/security/cu32/')) uploads.push(request.url());
  });
  await page.goto('/reconocimiento-camara');
  await page.getByRole('button', { name: 'Iniciar cámara' }).click();
  const recognizing = page.getByRole('status').filter({ hasText: 'Reconociendo' });
  await expect(recognizing.or(page.getByRole('alert'))).toBeVisible({ timeout: 45000 });
  await expect(recognizing).toBeVisible({ timeout: 1000 });
  await expect(page.getByText('0 visibles')).toBeVisible();
  await page.getByRole('button', { name: 'Detener cámara' }).click();
  expect(uploads).toEqual([]);
});
