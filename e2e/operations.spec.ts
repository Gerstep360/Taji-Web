import { expect, test } from '@playwright/test';

test.use({ channel: 'msedge' });

test('Operaciones: CRUD de garantías, comparación y alternativa manual', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  const quote = { provider: 'Proveedor de prueba', request_code: 'P-1', amount: '560.00', currency: 'BOB',
    delivery_days: 3, warranty_months: 12, scope: 'Material y traslado' };
  const base = { date: '2026-11-22' };
  const collections: Record<string, Record<string, unknown>[]> = {
    warranties: [], quotes: [
      { ...base, id: 2, title: 'Oferta alfa', status: 'received', details: quote },
      { ...base, id: 3, title: 'Oferta beta', status: 'received', details: { ...quote, amount: '400.00' } },
    ],
    inspections: [{ ...base, id: 4, title: 'Revisión de pasillo', status: 'draft', details: { location: 'Pasillo A' } }],
  };
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { user: {
      id: 8, email: 'demo@example.test', full_name: 'Administradora', is_approved: true,
      role: { slug: 'administrador', name: 'Administradora', permissions: ['manage_settings'] },
      active_tenant: { id: 1, name: 'Taji Demo' },
    } } });
    const match = path.match(/\/operations\/([^/]+)\/(?:(\d+|analyze)\/)?$/);
    if (!match) return route.fulfill({ json: {} });
    const [, kind, id] = match;
    const method = route.request().method();
    const rows = collections[kind];
    if (id === 'analyze') {
      const { ids } = route.request().postDataJSON() as { ids: number[] };
      expect(ids).toEqual(kind === 'quotes' ? [2, 3] : [4]);
      return route.fulfill({ json: kind === 'quotes' ? { ids, facts: { options: [
        { ...quote, option: 'A' }, { ...quote, option: 'B', amount: '400.00' },
      ] },
        suggestion: { summary: 'Revisar alcance y condiciones.', actions: ['Confirmar por escrito.'] } }
        : { ids, facts: { checks: { Iluminación: 'attention' } }, suggestion: null,
          message: 'NVIDIA no respondió. Puedes seguir con la revisión manual.' } });
    }
    if (method === 'GET') return route.fulfill({ json: { count: rows.length, results: rows, next: null, previous: null } });
    if (method === 'DELETE') { rows.pop(); return route.fulfill({ status: 204 }); }
    const row = { ...route.request().postDataJSON(), kind, id: 1 };
    if (id) rows[0] = row;
    else rows.push(row);
    return route.fulfill({ status: id ? 200 : 201, json: row });
  });

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/operaciones/garantias');
  await page.getByRole('button', { name: 'Nuevo registro' }).click();
  await page.getByLabel('Título').fill('Bomba del edificio');
  await page.getByLabel('Vencimiento', { exact: true }).fill('2026-11-22');
  await page.getByLabel('Garante o proveedor').fill('Demo');
  await page.getByLabel('Referencia de garantía').fill('GAR-21');
  await page.getByLabel('Cobertura').fill('Motor');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await page.getByRole('button', { name: 'Editar Bomba del edificio' }).click();
  await page.getByLabel('Título').fill('Bomba principal');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await page.getByRole('button', { name: 'Eliminar Bomba principal' }).click();
  await page.getByRole('button', { name: 'Sí, eliminar' }).click();
  await expect(page.getByText('No hay registros para mostrar.', { exact: false })).toBeVisible();

  const tabs = page.getByRole('navigation', { name: 'Libro de operaciones' });
  await tabs.getByRole('link', { name: 'Cotizaciones' }).click();
  await page.getByRole('checkbox', { name: 'Seleccionar Oferta alfa' }).check();
  await page.getByRole('checkbox', { name: 'Seleccionar Oferta beta' }).check();
  await page.getByRole('button', { name: 'Solicitar análisis' }).click();
  await expect(page.getByText('Revisar alcance y condiciones.')).toBeVisible();
  await page.screenshot({ path: info.outputPath('cu36-escritorio.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await tabs.getByRole('link', { name: 'Inspecciones' }).click();
  await page.getByRole('checkbox', { name: 'Seleccionar Revisión de pasillo' }).check();
  await page.getByRole('button', { name: 'Solicitar análisis' }).click();
  await expect(page.getByText('NVIDIA no respondió.', { exact: false })).toBeVisible();
  await expect(page.getByText('Iluminación: Requiere atención')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const element of document.querySelectorAll('main, .layout-content')) element.scrollTop = 0;
  });
  await page.screenshot({ path: info.outputPath('cu37-angosto.png'), fullPage: true });
});
