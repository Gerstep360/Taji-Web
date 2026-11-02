import { expect, test, Page } from '@playwright/test';

test.use({ channel: 'msedge' });
const columns = [
  { key: 'public_code', label: 'Código', type: 'text', operators: ['eq', 'contains'], choices: [] },
  { key: 'title', label: 'Título', type: 'text', operators: ['contains', 'is_empty'], choices: [] },
  {
    key: 'status',
    label: 'Estado',
    type: 'choice',
    operators: ['eq', 'ne'],
    choices: [{ value: 'REPORTED', label: 'Reportada' }],
  },
];
const request = {
  source: 'incidents',
  title: 'Incidencias pendientes',
  columns: ['public_code', 'title', 'status'],
  filters: [{ field: 'status', operator: 'eq', value: 'REPORTED' }],
  ordering: [{ field: 'title', direction: 'desc' }],
  page: 1,
  page_size: 25,
};
const preview = (page = 1, total = 26) => ({
  title: 'Incidencias pendientes',
  source: 'incidents',
  columns,
  rows: [[`INC-${page}`, 'Luminaria del acceso principal', 'Reportada']],
  pagination: { page, page_size: 25, total, pages: Math.max(1, Math.ceil(total / 25)) },
  can_export: total <= 10000,
});

async function setup(page: Page, role = 'administrador') {
  const calls: { path: string; body: any }[] = [];
  let fail = false;
  let total = 26;
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    calls.push({ path, body });
    if (path.endsWith('/auth/me/'))
      return route.fulfill({
        json: {
          user: {
            id: 1,
            email: 'cu31@test.local',
            full_name: 'Ana Administradora',
            first_name: 'Ana',
            is_superuser: false,
            is_approved: true,
            role: { slug: role, name: role, permissions: [] },
            active_tenant: { id: 1, name: 'Condominio Taji' },
          },
        },
      });
    if (path.endsWith('/cu31/catalog/'))
      return route.fulfill({
        json: {
          cu: 'CU31',
          condominium: { id: 1, name: 'Condominio Taji' },
          export_limit: 10000,
          formats: ['xlsx', 'csv', 'html'],
          voice_enabled: true,
          voice_suggestions: ['Incidencias pendientes', 'Residentes activos'],
          sources: [
            {
              key: 'incidents',
              label: 'Incidencias',
              description: 'Consulta estados y fechas de las incidencias.',
              columns,
              default_columns: columns.map((c) => c.key),
              default_ordering: [{ field: 'public_code', direction: 'asc' }],
            },
            {
              key: 'staff',
              label: 'Personal',
              description: 'Personal del condominio activo.',
              columns,
              default_columns: ['title'],
              default_ordering: [{ field: 'title', direction: 'asc' }],
            },
          ],
        },
      });
    if (path.endsWith('/cu31/preview/'))
      return route.fulfill(
        fail
          ? { status: 503, json: { detail: 'Servicio temporalmente no disponible.' } }
          : { json: preview(body.page, total) },
      );
    if (path.endsWith('/cu31/voice-query/'))
      return route.fulfill({
        json: {
          voice_transcript: body.voice_text,
          spoken_summary: 'Hay 26 incidencias pendientes.',
          understood_intent: {
            source: 'incidents',
            detected_filters: request.filters,
            detected_format: 'csv',
          },
          report_request: request,
          report_preview: preview(),
        },
      });
    if (path.endsWith('/cu31/export/'))
      return route.fulfill({
        contentType: 'text/csv',
        headers: { 'Content-Disposition': 'attachment; filename="reporte-incidents.csv"' },
        body: 'Código,Título\nINC-1,Luminaria',
      });
    return route.fulfill({ json: {} });
  });
  return {
    calls,
    setFail: (value: boolean) => (fail = value),
    setTotal: (value: number) => (total = value),
  };
}

test('CU31 configura, pagina y exporta la consulta revisada; responsive', async ({ page }) => {
  const api = await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reportes');
  await expect(
    page.getByRole('heading', { name: 'Reportes y consultas', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '+ Agregar filtro' }).click();
  await page.getByLabel('Campo 1', { exact: true }).selectOption('status');
  await page.getByLabel('Valor 1', { exact: true }).selectOption('REPORTED');
  await page.getByRole('button', { name: 'Generar vista previa' }).click();
  await expect(page.getByRole('cell', { name: 'INC-1', exact: true })).toBeVisible();
  expect(api.calls.find((c) => c.path.endsWith('/preview/'))?.body.filters).toEqual(
    request.filters,
  );
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'INC-2', exact: true })).toBeVisible();
  await page.getByLabel('Consulta del reporte', { exact: true }).fill('Incidencias pendientes');
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.getByText('Consulta interpretada.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'INC-2', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar reporte', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('reporte-incidents.csv');
  const exportCall = api.calls.find((c) => c.path.endsWith('/export/'));
  expect(exportCall?.body.filters).toEqual(request.filters);
  expect(exportCall?.body.ordering).toEqual(request.ordering);
  expect(exportCall?.body.format).toBe('csv');
  await page.screenshot({ path: 'docs/screenshots/CU31-web-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/CU31-web-mobile.png', fullPage: true });
  await page.getByLabel('Nombre del reporte', { exact: false }).fill('Otro reporte');
  await expect(
    page.getByRole('button', { name: 'Descargar reporte', exact: true }),
  ).not.toBeVisible();
  api.setFail(true);
  await page.getByRole('button', { name: 'Generar vista previa' }).click();
  await expect(page.getByRole('alert')).toContainText('Servicio temporalmente no disponible');
  await expect(page.getByLabel('Nombre del reporte', { exact: false })).toHaveValue('Otro reporte');
  api.setFail(false);
  api.setTotal(10001);
  await page.getByRole('button', { name: 'Generar vista previa' }).click();
  await expect(page.getByRole('button', { name: 'Descargar reporte', exact: true })).toBeDisabled();
});

test('CU31 residente no accede ni solicita reportes', async ({ page }) => {
  const api = await setup(page, 'residente');
  await page.goto('/reportes');
  await expect(page).toHaveURL(/acceso-denegado/);
  expect(api.calls.some((c) => c.path.includes('/cu31/'))).toBe(false);
});
