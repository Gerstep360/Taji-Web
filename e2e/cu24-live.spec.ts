import { expect, test } from '@playwright/test';

const api = process.env['CU24_LIVE_URL'];
test.use({ channel: 'msedge' });
test.skip(!api, 'Requiere scripts/serve_cu24_test_api.py y CU24_LIVE_URL.');

test('CU18 y seguimiento existentes conservan contrato real y enlaces de Eunice', async ({ page }) => {
  expect((await page.request.post(`${api}/api/v1/auth/login/`, { data: { email: 'administrador@cu24.test', password: 'OnlyLocal-CU24-123!' } })).status()).toBe(200);
  await page.route('**/config/app-config.json', route => route.fulfill({ json: { apiBaseUrl: `${api}/api/v1`, requestTimeoutMs: 12000 } }));
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  const optionsResponse = await page.request.get(`${api}/api/v1/paquete3/incidents/options/`);
  expect(optionsResponse.status()).toBe(200);
  const options = await optionsResponse.json();
  await page.goto('/registrar-incidencia');
  await expect(page).toHaveURL(/reportar-incidencia/);
  await page.getByLabel('Título', { exact: false }).fill('Reporte real de integración');
  await page.getByLabel('Descripción *', { exact: true }).fill('Hay una filtración en la sala de bombas del condominio de prueba.');
  await page.getByLabel('Categoría *', { exact: true }).selectOption(String(options.categories[0].id));
  await page.getByLabel('Ubicación *', { exact: true }).selectOption(String(options.sectors[0].id));
  const created = page.waitForResponse(response => response.url().endsWith('/paquete3/incidents/') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enviar reporte', exact: true }).click();
  const response = await created;
  expect(response.status(), await response.text()).toBe(201);
  const incident = await response.json();
  await expect(page.getByText(incident.public_code, { exact: true })).toBeVisible();
  await page.goto(`/seguimiento-incidencias?codigo=${incident.public_code}`);
  await expect(page).toHaveURL(/incidencias/);
  await expect(page.getByRole('heading', { name: 'Seguimiento de incidencias', exact: true })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(incident.public_code) }).click();
  await page.getByLabel('Agregar comentario', { exact: true }).fill('Comentario de integración Web y Django.');
  await page.getByRole('button', { name: 'Enviar comentario', exact: true }).click();
  await expect(page.getByText('Comentario de integración Web y Django.', { exact: true })).toBeVisible();
});

test('CU24 Web y Django reales: QR por cámara, detalle, historial y aislamiento', async ({
  page,
}) => {
  const login = await page.request.post(`${api}/api/v1/auth/login/`, {
    data: { email: 'administrador@cu24.test', password: 'OnlyLocal-CU24-123!' },
  });
  expect(login.status(), await login.text()).toBe(200);
  await page.route('**/config/app-config.json', (route) =>
    route.fulfill({ json: { apiBaseUrl: `${api}/api/v1`, requestTimeoutMs: 12000 } }),
  );
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  const image = await page.request.get(`${api}/__cu24_fixture.png`);
  const png = (await image.body()).toString('base64');
  await page.addInitScript(
    ({ png }) => {
      const w = window as any;
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            const image = new Image();
            image.src = 'data:image/png;base64,' + png;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(image, 0, 0);
            const stream = canvas.captureStream(10);
            const track = stream.getTracks()[0],
              stop = track.stop.bind(track);
            track.stop = () => {
              w.cu24TrackStopped = true;
              stop();
            };
            return stream;
          },
        },
      });
    },
    { png },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/identificar-activo-qr');
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bomba principal 11111111', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).cu24TrackStopped)).toBe(true);
  await page.getByRole('button', { name: 'Ver historial', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Historial del activo', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Fuga en la bomba', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Órdenes de trabajo/ }).click();
  await expect(page.getByText('Inspección programada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Planes de mantenimiento/ }).click();
  await expect(page.getByText('Revisión trimestral', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/screenshots/CU24-live-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/CU24-live-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Escanear otro', exact: true }).click();
  await page
    .getByLabel('Código QR (manual):', { exact: true })
    .fill('TAJI-ASSET.22222222111141118111111111111111');
  await page.getByRole('button', { name: 'Validar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Activo no encontrado', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Bomba principal 22222222', { exact: true })).not.toBeVisible();
});

test('CU24 Django y guard Web deniegan acceso a residente', async ({ page }) => {
  expect(
    (
      await page.request.post(`${api}/api/v1/auth/login/`, {
        data: { email: 'residente@cu24.test', password: 'OnlyLocal-CU24-123!' },
      })
    ).status(),
  ).toBe(200);
  const response = await page.request.post(`${api}/api/v1/assets/scan/`, {
    data: { qr_payload: 'TAJI-ASSET.11111111111141118111111111111111' },
  });
  expect(response.status()).toBe(403);
  await page.route('**/config/app-config.json', (route) =>
    route.fulfill({ json: { apiBaseUrl: `${api}/api/v1`, requestTimeoutMs: 12000 } }),
  );
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  await page.goto('/identificar-activo-qr');
  await expect(page).toHaveURL(/acceso-denegado/);
});
