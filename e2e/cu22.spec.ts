import { expect, test } from '@playwright/test';
test.use({ channel: 'msedge' });

test('CU22 conserva predicción, permite revisión y ofrece clasificación manual si NVIDIA falla', async ({
  page,
}) => {
  let requested = false,
    failed = false,
    reviewed = false;
  const user = {
    id: 1,
    email: 'cu22@test.local',
    full_name: 'Ana Administradora',
    first_name: 'Ana',
    is_superuser: true,
    is_approved: true,
    role: { slug: 'administrador', name: 'Administración', permissions: ['manage_incidents'] },
    active_tenant: { id: 1, name: 'Condominio Taji' },
  };
  const incident = {
    public_code: 'INC-1-000022',
    title: 'Humo en el garaje',
    description: 'Hay incendio y los niños están lejos.',
    status: 'REPORTED',
    status_display: 'Reportada',
    priority: { name: 'Media' },
    current_assignee: null,
    due_at: null,
    is_overdue: false,
    status_history: [],
    public_comments: [],
    internal_comments: [],
    attachments: [],
    assignments: [],
    can_modify_target_date: true,
    can_view_internal_comments: true,
    can_post_internal_comments: true,
  };
  const analysis = () => ({
    id: failed ? 2 : 1,
    execution_status: failed ? 'FAILED' : 'SUCCEEDED',
    review_status: reviewed ? 'ACCEPTED' : 'PENDING',
    category: failed ? null : { id: 1, name: 'Incendios y humo' },
    priority: failed ? null : { id: 3, name: 'Alta' },
    confidence: 0.9,
    risk_score: 70,
    summary: 'Se reporta un incendio; los niños están fuera del peligro.',
    model: 'NVIDIA · modelo de prueba',
    model_version: 'cu22-1',
    duration_ms: 2200,
    error_code: failed ? 'timeout' : '',
    risks: [
      { name: 'Incendio', evidence: 'incendio', context: 'present' },
      { name: 'Niños fuera del peligro', evidence: 'niños están lejos', context: 'distant' },
    ],
    safety_findings: [
      { name: 'Fuego presente', evidence: 'incendio', context: 'present', active: true },
    ],
    recommendations: ['Mantén distancia y avisa al equipo responsable.'],
    entities: [{ entity_type: 'PERSON', text_value: 'niños', normalized_value: 'distant' }],
    original_prediction: { category_code: 'FIRE', priority_code: 'HIGH' },
    review: reviewed
      ? { reason: 'Verifiqué el reporte con seguridad.', reviewer: 'Ana Administradora' }
      : null,
  });
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path.endsWith('/auth/me/')) body = { user };
    else if (path.endsWith('/incident-ai/catalogs/'))
      body = {
        categories: [{ id: 1, name: 'Incendios y humo' }],
        priorities: [{ id: 3, name: 'Alta', rank: 3 }],
        can_manage: true,
      };
    else if (
      path.endsWith('/alerts/') ||
      path.endsWith('/transitions/') ||
      path.endsWith('/assignees/')
    )
      body = [];
    else if (path.endsWith('/review/')) {
      const payload = route.request().postDataJSON();
      expect(payload.category).toBe(1);
      expect(payload.priority).toBe(3);
      reviewed = true;
      incident.priority.name = 'Alta';
      body = analysis();
    } else if (path.endsWith('/ai/')) {
      if (route.request().method() === 'POST') {
        requested = true;
        body = analysis();
      } else
        body = { analyses: requested ? [analysis()] : [], can_analyze: true, can_review: true };
    } else if (path.endsWith('/INC-1-000022/')) body = incident;
    else if (path.endsWith('/incidents/'))
      body = { results: [incident], pagination: { total_pages: 1 } };
    await route.fulfill({ json: body });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/analisis-incidencias');
  await page.getByRole('button', { name: /INC-1-000022/ }).click();
  await page.getByRole('button', { name: 'Analizar con IA', exact: true }).click();
  await expect(page.getByText('Propuesta pendiente de revisión', { exact: true })).toBeVisible();
  await expect(page.getByText('Fuera del peligro', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Motivo de la revisión').fill('Verifiqué el reporte con seguridad.');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/screenshots/CU22-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Guardar revisión y aplicar clasificación' }).click();
  await expect(page.getByText('Revisado por Ana Administradora', { exact: true })).toBeVisible();
  failed = true;
  reviewed = false;
  await page.getByRole('button', { name: 'Analizar de nuevo' }).click();
  await expect(page.getByRole('heading', { name: 'Clasificar manualmente' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/CU22-manual-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});
