import { expect, test } from '@playwright/test';
const api = process.env['CU24_LIVE_URL'];
test.use({ channel: 'msedge' });
test.skip(!api, 'Requiere scripts/serve_cu24_test_api.py y CU24_LIVE_URL.');

test.beforeEach(async ({ page }) => {
  const login = await page.request.post(`${api}/api/v1/auth/login/`, { data: {
    email: 'administrador@cu24.test', password: 'OnlyLocal-CU24-123!',
  } });
  expect(login.status()).toBe(200);
  await page.route('**/config/app-config.json', r => r.fulfill({ json: { apiBaseUrl: `${api}/api/v1`, requestTimeoutMs: 12000 } }));
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
});

test('CU23: crear, editar y consultar activo con API real', async ({ page }) => {
  const code = `E2E-${Date.now()}`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/activos');
  await page.getByRole('button', { name: 'Nuevo activo', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Nuevo activo', exact: true });
  await editor.getByLabel('Código *', { exact: true }).fill(code);
  await editor.getByLabel('Nombre *', { exact: true }).fill('Bomba de integración');
  await editor.getByRole('combobox', { name: 'Tipo de activo *', exact: true }).selectOption({ index: 1 });
  await editor.getByRole('combobox', { name: 'Sector *', exact: true }).selectOption({ index: 1 });
  await editor.getByRole('button', { name: 'Guardar activo', exact: true }).click();
  await expect(editor).not.toBeVisible();
  const row = page.getByRole('row').filter({ hasText: code });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Marca', { exact: true }).fill('Taji prueba');
  await page.getByRole('button', { name: 'Guardar activo', exact: true }).click();
  await row.getByRole('button', { name: 'Ficha', exact: true }).click();
  await expect(page.locator('img[src^="data:image/"]')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/CU23-live-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/CU23-live-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('CU25: crear orden, asignar proveedor y completar con historial real', async ({ page }) => {
  const title = `Inspección E2E ${Date.now()}`;
  const supplierResponse = await page.request.post(`${api}/api/v1/maintenance/suppliers/`, { data: { name: title, email: 'supplier@cu24.test' } });
  expect(supplierResponse.status(), await supplierResponse.text()).toBe(201);
  const supplier = await supplierResponse.json();
  const assets = await (await page.request.get(`${api}/api/v1/assets/`)).json();
  await page.goto('/mantenimiento');
  await page.getByRole('button', { name: 'Nueva orden', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nueva orden de trabajo', exact: true });
  await form.getByLabel('Título *', { exact: true }).fill(title);
  await form.getByRole('combobox', { name: 'Activo *', exact: true }).selectOption(String(assets.results[0].id));
  await form.getByRole('button', { name: 'Guardar orden', exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.locator('.order-card').filter({ hasText: title }).getByRole('button', { name: 'Ver detalles', exact: true }).click();
  const detail = page.getByRole('dialog');
  await detail.getByRole('combobox', { name: 'Proveedor', exact: true }).selectOption(String(supplier.id));
  await detail.getByRole('button', { name: 'Asignar', exact: true }).click();
  await expect(detail.locator('.detail-overview')).toContainText('Asignada');
  await detail.getByRole('button', { name: 'Iniciar trabajo', exact: true }).click();
  await expect(detail.locator('.detail-overview')).toContainText('En progreso');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/screenshots/CU25-live-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/CU25-live-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await detail.getByLabel('Nota de seguimiento', { exact: true }).fill('Prueba real finalizada.');
  await detail.getByRole('button', { name: 'Completar orden', exact: true }).click();
  await expect(detail.locator('.timeline')).toContainText('Prueba real finalizada.');
});
