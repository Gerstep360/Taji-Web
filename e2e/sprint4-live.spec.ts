import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Uses the local, SQLite-in-memory fixture in Backend/scripts/serve_cu24_test_api.py.
const fixture = process.env['CU24_LIVE_URL'];
const localFixture = fixture && /^http:\/\/(localhost|127\.0\.0\.1):18766$/.test(fixture);
const api = `${fixture}/api/v1`;
test.use({ channel: 'msedge' });
test.skip(!localFixture, 'Requiere la API de prueba local del sprint en el puerto 18766.');

async function login(client: APIRequestContext, role = 'administrador') {
  const response = await client.post(`${api}/auth/login/`, {
    data: { email: `${role}@cu24.test`, password: 'OnlyLocal-CU24-123!' },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function post(client: APIRequestContext, path: string, data: object, status: number) {
  const response = await client.post(`${api}/${path}`, { data });
  expect(response.status(), await response.text()).toBe(status);
  return response.json();
}

async function useLiveApi(page: Page) {
  await page.route('**/config/app-config.json', route => route.fulfill({
    json: { apiBaseUrl: api, requestTimeoutMs: 12000 },
  }));
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
}

test('CU26–27: horario y bloqueo en calendario; reserva, conflicto y transiciones', async ({ page, playwright }) => {
  await login(page.request);
  await useLiveApi(page);
  const area = await post(page.request, 'community/areas/', {
    name: `Salón Sprint ${Date.now()}`, requires_approval: true,
  }, 201);
  const future = new Date(Date.now() + 3 * 86_400_000);
  const date = future.toISOString().slice(0, 10);
  const at = (hour: number) => `${date}T${String(hour).padStart(2, '0')}:00:00-04:00`;
  await post(page.request, 'community/area-schedules/', {
    common_area: area.id, weekday: (future.getUTCDay() + 6) % 7, opens_at: '08:00', closes_at: '20:00',
  }, 201);
  await post(page.request, 'community/area-blocks/', {
    common_area: area.id, blocked_from: at(14), blocked_until: at(16), reason: 'Limpieza programada',
  }, 201);
  const resident = await playwright.request.newContext();
  try {
    await login(resident, 'residente');
    const availability = await resident.get(`${api}/paquete5/cu27/areas/${area.id}/availability/?date=${date}`);
    expect(availability.status(), await availability.text()).toBe(200);
    expect((await availability.json()).free).toHaveLength(2);
    const reservations = 'paquete5/cu27/reservations/';
    const payload = (start: number, end: number) => ({ common_area: area.id, start_at: at(start), end_at: at(end) });
    await post(resident, reservations, payload(14, 15), 400);
    const first = await post(resident, reservations, payload(10, 12), 201);
    expect(first.status).toBe('PENDING');
    await post(resident, reservations, payload(11, 12), 400);
    await post(resident, `${reservations}${first.id}/approve/`, {}, 403);
    expect((await post(page.request, `${reservations}${first.id}/approve/`, {}, 200)).status).toBe('APPROVED');
    expect((await post(resident, `${reservations}${first.id}/cancel/`, {}, 200)).status).toBe('CANCELLED');
    const second = await post(resident, reservations, payload(10, 12), 201);
    expect((await post(page.request, `${reservations}${second.id}/reject/`, { reason: 'Revisión de prueba' }, 200)).status).toBe('REJECTED');
  } finally {
    await resident.dispose();
  }
  await page.goto('/calendario-reservas');
  await expect(page.getByRole('heading', { name: 'Calendario de áreas comunes y reservas' })).toBeVisible();
  await page.goto('/reservas-areas');
  await expect(page.getByRole('heading', { name: 'Reservas de áreas comunes' })).toBeVisible();
});

test('CU28–29: publicar, notificar e inscribir acuerdos; Web consume el mismo contrato', async ({ page, playwright }) => {
  await login(page.request);
  await useLiveApi(page);
  const title = `Aviso Sprint ${Date.now()}`;
  const announcement = await post(page.request, 'paquete5/cu28/announcements/', {
    title, body: 'Comunicado de integración.', audience: 'RESIDENTS', priority: 'HIGH', status: 'PUBLISHED',
  }, 201);
  const assembly = await post(page.request, 'assemblies/', {
    title: `Asamblea Sprint ${Date.now()}`, description: 'Prueba de acuerdos',
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(), location: 'Salón local',
  }, 201);
  await post(page.request, `assemblies/${assembly.id}/start/`, {}, 200);
  const agreement = await post(page.request, 'agreements/', {
    assembly: assembly.id, title: 'Revisar presupuesto de integración',
  }, 201);
  const agreementDetail = await page.request.get(`${api}/agreements/${agreement.id}/`);
  expect(agreementDetail.status()).toBe(200);
  expect((await agreementDetail.json()).assembly).toBe(assembly.id);
  const resident = await playwright.request.newContext();
  try {
    await login(resident, 'residente');
    expect((await resident.get(`${api}/paquete5/cu28/announcements/${announcement.id}/`)).status()).toBe(200);
    const unread = await resident.get(`${api}/notifications/?unread=true`);
    expect(unread.status(), await unread.text()).toBe(200);
    expect((await unread.json()).results).toEqual(expect.arrayContaining([expect.objectContaining({ title, priority: 'HIGH' })]));
    expect((await resident.get(`${api}/agreements/${agreement.id}/`)).status()).toBe(403);
  } finally {
    await resident.dispose();
  }
  await page.goto('/comunicados');
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  await page.goto('/asambleas');
  await expect(page.getByText(assembly.title, { exact: true }).first()).toBeVisible();
});

test('CU30: la web consulta el dashboard y el catálogo del condominio real', async ({ page }) => {
  await login(page.request);
  await useLiveApi(page);
  const loaded = page.waitForResponse(response => response.url().includes('/paquete5/cu30/dashboard/') && response.ok());
  await page.goto('/dashboard-reportes');
  await expect(page.getByRole('heading', { name: 'Dashboard y Reportes' })).toBeVisible();
  const dashboard = await (await loaded).json();
  expect(dashboard.context.name).toBe('CU24 Prueba local');
  expect(dashboard.incidents.total).toBeGreaterThan(0);
  const catalog = page.waitForResponse(response => response.url().includes('/paquete5/cu30/reports/catalog/') && response.ok());
  await page.getByRole('button', { name: 'Reportes detallados' }).click();
  await expect(page.getByRole('heading', { name: 'Reportes detallados' })).toBeVisible();
  expect((await (await catalog).json()).context.name).toBe(dashboard.context.name);
  const body = { source: 'incidents', columns: ['title'] };
  const preview = await post(page.request, 'paquete5/cu30/reports/preview/', body, 200);
  expect(preview.rows).toContainEqual(['Fuga en la bomba']);
  const exportResponse = await page.request.post(`${api}/paquete5/cu30/reports/export/`, {
    data: { ...body, format: 'csv' },
  });
  expect(exportResponse.status(), await exportResponse.text()).toBe(200);
  expect(exportResponse.headers()['content-type']).toContain('text/csv');
  expect(await exportResponse.text()).toContain('Fuga en la bomba');
});
