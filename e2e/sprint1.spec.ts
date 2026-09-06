import { expect, test, Page } from '@playwright/test';

async function login(page: Page, email = 'admin@sprint1.taji.test') {
  await page.goto('/iniciar-sesion');
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
  await page.locator('input[type=password]').fill('TajiSprint1-Test2026!');
  await page.getByRole('button', { name: 'Ingresar a Taji' }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

test('CU01–CU07 consumen Django y conservan sesión al recargar', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', response => {
    if (response.url().includes('/api/v1/') && response.status() >= 400 &&
        !response.url().includes('/auth/refresh/')) failures.push(`${response.status()} ${response.url()}`);
  });
  await login(page);
  for (const path of ['roles-y-permisos', 'condominium/config', 'sectores-unidades',
    'residentes-y-copropietarios', 'residentes-unidades', 'personal']) {
    await page.goto(`/${path}`);
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  }
  await page.goto('/roles-y-permisos');
  await expect(page.getByRole('heading', { name: 'Roles y Permisos' })).toBeVisible();
  await page.getByRole('button', { name: /Residentes pendientes/ }).click();
  await page.waitForLoadState('networkidle');
  await page.goto('/condominium/config');
  await page.getByLabel('Nombre del Condominio').fill('Taji — verificación Sprint 1');
  await page.getByRole('button', { name: 'Guardar Cambios' }).click();
  await expect(page.locator('.message-success')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nombre del Condominio')).toHaveValue('Taji — verificación Sprint 1');
  expect(failures).toEqual([]);
});

test('el residente conserva los controles de acceso de CU02', async ({ page }) => {
  await login(page, 'residente@sprint1.taji.test');
  await page.goto('/roles-y-permisos');
  await expect(page).toHaveURL(/\/acceso-denegado$/);
  await expect(page.getByText('No tienes permisos para acceder a esta sección.')).toBeVisible();
});

test('CU02 de Noelia aprueba una solicitud real de residente', async ({ page }) => {
  const email = `pendiente-${Date.now()}@sprint1.taji.test`;
  const response = await page.request.post('/api/v1/auth/register/', { data: {
    email, first_name: 'Solicitud', last_name: 'Sprint Uno',
    password: 'TajiSprint1-Test2026!', password_confirm: 'TajiSprint1-Test2026!',
  }});
  expect(response.status()).toBe(201);
  await login(page);
  await page.goto('/roles-y-permisos');
  await page.getByRole('button', { name: /Residentes pendientes/ }).click();
  const row = page.getByRole('row').filter({ hasText: email });
  await row.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect(page.getByText('Residente aprobado correctamente.')).toBeVisible();
  await expect(row).toHaveCount(0);
});
