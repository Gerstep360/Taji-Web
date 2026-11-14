import { expect, Page, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

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
    if (request.url().includes('/cu32/')) images.push(request.url());
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
    if (request.url().includes('/cu32/')) uploads.push(request.url());
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

test('visión opt-in, una sola ventana, revisión y apagado en ancho móvil', async ({ page }) => {
  await setup(page);
  let uploads = 0, stops = 0, reviewed = false;
  const base = { id: 'visual-demo', mode: 'image', sector: { id: 9, name: 'Acceso principal' },
    observed_from: '2026-11-13T22:12:00Z', observed_until: '2026-11-13T22:12:00Z' };
  const record = () => ({ ...base, status: 'succeeded', description: 'automóvil rojo',
    review_status: reviewed ? 'confirmed' : 'pending', has_evidence: false,
    prediction: { uncertainty: 'La captura no confirma movimientos.', suggested_action: 'human_review',
      relevance_reason: 'Revisión visual recomendada.' },
    context_matches: [{ code: 'DEMO-001', reason: 'Similitud de descripción y mismo sector', open: true }] });
  await page.route('**/paquete3/cu32/vision/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/settings/')) return route.fulfill({ json: { modes: ['image'], worker_ready: true,
      can_review: true, sectors: [base.sector], interval: 40, periodic: 150, idle: 240,
      session_burst: 3, retention_days: 30, image_max_bytes: 200000 } });
    if (path.endsWith('/sessions/')) return route.fulfill({ status: 201, json: { id: 'session-demo',
      expires_at: new Date(Date.now() + 600000).toISOString() } });
    if (path.endsWith('/windows/')) {
      uploads++;
      expect(route.request().postDataBuffer()?.includes(Buffer.from('captura.jpg'))).toBe(true);
      return route.fulfill({ status: 202, json: { ...base, status: 'queued' } });
    }
    if (path.endsWith('/stop/')) { stops++; return route.fulfill({ status: 204 }); }
    if (path.endsWith('/review/')) { reviewed = true; return route.fulfill({ json: record() }); }
    if (path.endsWith('/observations/')) return route.fulfill({ json: { results: uploads ? [record()] : [], next: null } });
    return route.fulfill({ json: record() });
  });
  await page.goto('/reconocimiento-camara');
  await page.getByRole('button', { name: 'Abrir observaciones' }).click();
  const activate = page.getByRole('button', { name: 'Activar análisis visual' });
  await expect(activate).toBeDisabled();
  await expect(page.getByText('Modo captura fija.')).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar cámara' }).click();
  await expect(activate).toBeEnabled();
  expect(uploads).toBe(0);
  await page.getByLabel('Sector de la cámara').selectOption('9');
  await activate.click();
  await page.getByRole('button', { name: /automóvil rojo/ }).click({ timeout: 15000 });
  await expect(page.getByRole('link', { name: 'DEMO-001' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await expect(page.getByText('Revisión humana · Confirmada')).toBeVisible();
  await page.screenshot({ path: '../.sprint3-work/vision-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Línea temporal' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../.sprint3-work/vision-390.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Detener cámara' }).click();
  await expect.poll(() => stops).toBe(1);
  expect(uploads).toBe(1);
  expect(await page.evaluate(() => Reflect.get(window, 'cameraStopped'))).toBe(true);
});

test('Edge captura una ventana MP4 sin audio desde el búfer local', async ({ page }) => {
  await setup(page);
  await page.route('**/paquete3/cu32/vision/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/settings/')) return route.fulfill({ json: { modes: ['image', 'video'], worker_ready: true,
      can_review: false, sectors: [], interval: 40, periodic: 150, idle: 240, session_burst: 3,
      retention_days: 30, image_max_bytes: 200000, video_max_bytes: 900000 } });
    if (path.endsWith('/sessions/')) return route.fulfill({ status: 201, json: { id: 'session-demo',
      expires_at: new Date(Date.now() + 600000).toISOString() } });
    if (path.endsWith('/windows/')) return route.fulfill({ status: 202, json: { id: 'clip-demo', status: 'skipped' } });
    return route.fulfill({ json: { results: [], next: null } });
  });
  await page.goto('/reconocimiento-camara');
  await page.getByRole('button', { name: 'Iniciar cámara' }).click();
  await page.getByRole('button', { name: 'Abrir observaciones' }).click();
  const supports = await page.evaluate(() => MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42001f'));
  test.skip(!supports, 'Este Edge no ofrece MediaRecorder MP4/H.264; el modo fijo se verifica por separado.');
  await expect(page.getByText('Modo ventanas breves.')).toBeVisible();
  const window = page.waitForRequest('**/paquete3/cu32/vision/sessions/*/windows/');
  await page.getByRole('button', { name: 'Activar análisis visual' }).click();
  const upload = (await window).postDataBuffer();
  expect(upload?.includes(Buffer.from('ventana.mp4'))).toBe(true);
  expect(upload?.includes(Buffer.from('ftyp'))).toBe(true);
  expect(upload?.includes(Buffer.from('soun'))).toBe(false);
  if (process.env['TAJI_TEST_MP4_OUTPUT'] && upload) {
    const headers = upload.indexOf(Buffer.from('Content-Type: video/mp4'));
    const start = upload.indexOf(Buffer.from('\r\n\r\n'), headers) + 4;
    const end = upload.lastIndexOf(Buffer.from('\r\n--'));
    expect(headers >= 0 && end > start).toBe(true);
    writeFileSync(process.env['TAJI_TEST_MP4_OUTPUT'], upload.subarray(start, end));
  }
  await page.getByRole('button', { name: 'Detener cámara' }).click();
});
