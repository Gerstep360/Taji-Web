import { expect, test } from '@playwright/test';
test.use({ channel: 'msedge' });

test('CU21 permite consultar seguimiento, comentar y cambiar estado en escritorio y móvil', async ({
  page,
}) => {
  const user = {
    id: 1,
    email: 'admin@cu21.test',
    first_name: 'Ana',
    full_name: 'Ana Administración',
    is_superuser: false,
    is_approved: true,
    role: { slug: 'administrador', name: 'Administración', permissions: ['manage_incidents'] },
    active_tenant: { id: 1, name: 'Condominio Taji', slug: 'taji' },
    available_tenants: [],
  };
  const detail = {
    public_code: 'INC-1-000021',
    title: 'Filtración en el pasillo',
    description: 'El agua llega desde el techo del pasillo de la torre A.',
    status: 'ASSIGNED',
    status_display: 'Asignada',
    due_at: '2026-11-02T18:00:00Z',
    is_overdue: false,
    current_assignee: { id: 3, full_name: 'Luis Mantenimiento' },
    category: { name: 'Plomería' },
    priority: { name: 'Alta' },
    status_history: [
      {
        id: 1,
        to_status_display: 'Reportada',
        comment: 'Incidencia registrada',
        changed_at: '2026-11-01T14:00:00Z',
        changed_by: { full_name: 'Marta Residente' },
      },
    ],
    public_comments: [],
    internal_comments: [],
    attachments: [],
    assignments: [
      {
        id: 1,
        assigned_to: { full_name: 'Luis Mantenimiento' },
        assigned_at: '2026-11-01T15:00:00Z',
        ended_at: null,
        reason: 'Revisar la filtración',
      },
    ],
    can_modify_target_date: true,
    can_view_internal_comments: true,
    can_post_internal_comments: true,
  };
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path.endsWith('/auth/me/')) body = { user };
    else if (path.endsWith('/ai/')) body = { analyses: [], can_analyze: false, can_review: false };
    else if (path.endsWith('/incident-ai/catalogs/'))
      body = { categories: [], priorities: [], can_manage: false };
    else if (path.endsWith('/alerts/')) body = [];
    else if (path.endsWith('/assignees/')) body = [{ id: 3, name: 'Luis Mantenimiento' }];
    else if (path.endsWith('/transitions/'))
      body = [{ value: 'IN_PROGRESS', label: 'En progreso' }];
    else if (path.endsWith('/change-status/')) {
      detail.status_display = 'En progreso';
      body = { incident: detail };
    } else if (path.endsWith('/comments/')) {
      const request = route.request().postDataJSON();
      expect(request).toEqual({ body: 'El técnico ya está en camino.', visibility: 'PUBLIC' });
      body = { id: 1 };
    } else if (path.endsWith('/INC-1-000021/')) body = detail;
    else if (path.endsWith('/incidents/'))
      body = { results: [detail], pagination: { total_pages: 1 } };
    await route.fulfill({ json: body });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/incidencias');
  await page.getByRole('button', { name: /INC-1-000021/ }).click();
  await expect(page.getByRole('heading', { name: 'Línea de tiempo' })).toBeVisible();
  await page.getByLabel('Nuevo estado').selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Guardar estado' }).click();
  await expect(page.locator('.badge')).toHaveText('En progreso');
  await page.getByLabel('Agregar comentario').fill('El técnico ya está en camino.');
  await page.getByRole('button', { name: 'Enviar comentario' }).click();
  await expect(page.getByLabel('Agregar comentario')).toHaveValue('');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/screenshots/CU21-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Línea de tiempo' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/screenshots/CU21-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.route('**/api/v1/paquete3/incidents/INC-1-000021/comments/', (route) =>
    route.fulfill({ status: 400, json: { error: { message: 'Revisa el comentario.' } } }),
  );
  await page.getByLabel('Agregar comentario').fill('No borrar al fallar');
  await page.getByRole('button', { name: 'Enviar comentario' }).click();
  await expect(page.locator('.error[role=alert]')).toContainText('Revisa el comentario.');
  await expect(page.getByLabel('Agregar comentario')).toHaveValue('No borrar al fallar');
});
