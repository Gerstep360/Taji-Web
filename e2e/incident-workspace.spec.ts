import { expect, test, Page } from '@playwright/test';
test.use({ channel: 'msedge', reducedMotion: 'reduce' });

test('La web distingue procesador desconectado y observaciones de fotos realmente enviadas', async ({
  page,
}) => {
  await session(page);
  let connected = false;
  const incident = {
    public_code: 'INC-1-777777',
    title: 'Revisar foto del pasillo',
    description: 'Hay humo en el pasillo.',
    category: { name: 'Incendios y humo' },
    priority: { name: 'Alta' },
  };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { user } });
    if (path.endsWith('/incident-ai/metrics/'))
      return route.fulfill({
        json: { total: 1, pending_review: 1, processing: 0, failed: 0, period_days: 30 },
      });
    if (path.endsWith('/incident-ai/catalogs/'))
      return route.fulfill({
        json: { categories: [{ id: 1, name: 'Incendios y humo' }], priorities, can_manage: true },
      });
    if (path.endsWith('/ai/'))
      return route.fulfill({
        json: {
          processor: {
            available: connected,
            last_seen: null,
            message: connected
              ? 'Procesador conectado.'
              : 'El procesador IA está desconectado. El reporte está guardado.',
          },
          can_analyze: true,
          can_review: true,
          analyses: [
            {
              id: 1,
              execution_status: connected ? 'SUCCEEDED' : 'QUEUED',
              review_status: 'PENDING',
              category: { id: 1, name: 'Incendios y humo' },
              priority: { id: 1, name: 'Alta', rank: 3 },
              confidence: 0.8,
              risk_score: 70,
              summary: 'Humo reportado en el pasillo.',
              model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
              model_version: 'cu22-3-omni',
              duration_ms: 2700,
              error_code: '',
              risks: [
                {
                  name: 'Humo visible',
                  evidence: 'Se observa humo en la parte superior',
                  context: 'present',
                  source: 'image',
                  attachment_id: 42,
                },
              ],
              recommendations: ['Mantén distancia y solicita atención.'],
              entities: [],
              safety_findings: [],
              review: null,
              media: [
                { attachment_id: 42, status: 'sent', reason: '' },
                { attachment_id: 43, status: 'skipped', reason: 'unreadable_image' },
              ],
            },
          ],
        },
      });
    if (path.endsWith('/INC-1-777777/')) return route.fulfill({ json: incident });
    return route.fulfill({ json: { results: [incident], pagination: { total_pages: 1 } } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/analisis-incidencias?codigo=INC-1-777777');
  await expect(
    page.getByRole('heading', { name: 'El procesador no está conectado', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Tu reporte está guardado. No necesitas enviarlo otra vez:', { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/ia-procesador-desconectado.png',
    fullPage: true,
    animations: 'disabled',
  });
  connected = true;
  await page.getByRole('button', { name: 'Actualizar estado del análisis', exact: true }).click();
  await expect(
    page.getByText('Procesador conectado · texto y fotos', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Observación visual por verificar · foto #42', { exact: false }),
  ).toBeVisible();
  await page.getByText('Fotos utilizadas en este análisis', { exact: true }).click();
  await expect(page.getByText('Foto #43 · No se pudo leer la foto', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(1400, 0);
  await page.screenshot({
    path: 'docs/screenshots/ia-omni-fotos-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('La cola IA muestra progreso, evita solicitudes duplicadas y actualiza el resultado', async ({
  page,
}) => {
  await session(page);
  let requested = false,
    reads = 0,
    posts = 0;
  const incident = {
    public_code: 'INC-1-000101',
    title: 'Humo en el pasillo',
    description: 'Hay humo y los vecinos están a salvo.',
    category: { name: 'Incendios y humo' },
    priority: { name: 'Alta' },
  };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { user } });
    if (path.endsWith('/incident-ai/metrics/'))
      return route.fulfill({
        json: { total: 1, pending_review: 1, processing: 0, failed: 0, period_days: 30 },
      });
    if (path.endsWith('/incident-ai/catalogs/'))
      return route.fulfill({ json: { categories, priorities, can_manage: true } });
    if (path.endsWith('/ai/')) {
      if (route.request().method() === 'POST') {
        requested = true;
        posts++;
        return route.fulfill({ status: 202, json: { id: 1, execution_status: 'QUEUED' } });
      }
      const status = !requested
        ? null
        : ++reads < 3
          ? reads === 1
            ? 'QUEUED'
            : 'RUNNING'
          : 'SUCCEEDED';
      return route.fulfill({
        json: {
          can_analyze: true,
          can_review: true,
          analyses: status
            ? [
                {
                  id: 1,
                  execution_status: status,
                  review_status: 'PENDING',
                  category: { id: 1, name: 'Incendios y humo' },
                  priority: { id: 1, name: 'Alta', rank: 3 },
                  confidence: 0.9,
                  risk_score: 70,
                  summary: 'Humo reportado; personas fuera del peligro.',
                  model: 'NVIDIA',
                  model_version: 'cu22-2-literal',
                  duration_ms: 2000,
                  error_code: '',
                  risks: [{ name: 'Humo', evidence: 'humo', context: 'present' }],
                  recommendations: ['Mantén distancia y avisa a seguridad.'],
                  entities: [],
                  safety_findings: [],
                  review: null,
                },
              ]
            : [],
        },
      });
    }
    if (path.endsWith('/INC-1-000101/')) return route.fulfill({ json: incident });
    return route.fulfill({ json: { results: [incident], pagination: { total_pages: 1 } } });
  });
  await page.goto('/analisis-incidencias?codigo=INC-1-000101');
  await page.getByRole('button', { name: 'Analizar con IA', exact: true }).click();
  await expect(page.getByText('Tu reporte está en la cola de análisis')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analizando…', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'docs/screenshots/analisis-procesando.png', fullPage: true });
  await expect(page.getByText('Propuesta pendiente de revisión', { exact: true })).toBeVisible({
    timeout: 10000,
  });
  expect(posts).toBe(1);
  await expect(page.getByText('Humo reportado; personas fuera del peligro.')).toBeVisible();
});

const user = {
  id: 1,
  email: 'incidents@test.local',
  full_name: 'Ana Administradora',
  first_name: 'Ana',
  is_superuser: true,
  is_approved: true,
  role: { slug: 'administrador', name: 'Administración', permissions: ['manage_incidents'] },
  active_tenant: { id: 1, name: 'Condominio Taji' },
};
const categories = [
  {
    id: 1,
    code: 'PLUMBING',
    name: 'Plomería',
    description: 'Filtraciones y tuberías',
    default_staff_type: 'MAINTENANCE',
    is_active: true,
  },
];
const priorities = [
  {
    id: 1,
    code: 'HIGH',
    name: 'Alta',
    rank: 3,
    target_minutes: 120,
    min_score: '50.00',
    max_score: '75.00',
    is_active: true,
  },
];
async function session(page: Page) {
  await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
}

test('Reportar está habilitado, valida evidencias, conserva datos ante error y confirma el envío', async ({
  page,
}) => {
  await session(page);
  let attempts = 0;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { user } });
    if (path.endsWith('/incidents/options/'))
      return route.fulfill({
        json: {
          categories,
          priorities,
          sectors: [
            { id: 1, code: 'A', name: 'Torre A', parent: null },
            { id: 2, code: 'B', name: 'Torre B', parent: null },
          ],
          units: [
            { id: 1, code: 'A-101', sector: 1 },
            { id: 2, code: 'B-201', sector: 2 },
          ],
          assets: [],
          evidence_rules: {
            max_files: 2,
            max_file_size_bytes: 1024,
            allowed_extensions: ['png', 'pdf'],
          },
        },
      });
    if (path.endsWith('/incidents/') && route.request().method() === 'POST') {
      attempts++;
      expect(route.request().headers()['content-type']).toContain('multipart/form-data');
      expect(route.request().postData()).toContain('Filtración del techo');
      expect(route.request().postData()).not.toContain('B-201');
      if (attempts === 1)
        return route.fulfill({
          status: 503,
          json: { error: { message: 'Intenta nuevamente; el servicio no está disponible.' } },
        });
      return route.fulfill({
        status: 201,
        json: {
          public_code: 'INC-1-000018',
          status_display: 'Reportada',
          category: { name: 'Plomería' },
          priority: { name: 'Media' },
        },
      });
    }
    return route.fulfill({ json: { results: [], pagination: { total_pages: 1 } } });
  });
  await page.goto('/reportar-incidencia');
  await page.getByRole('button', { name: /Incidencias e IA/ }).click();
  await expect(page.getByRole('link', { name: 'Reportar Incidencia', exact: true })).toBeVisible();
  await page.getByLabel('Título', { exact: false }).fill('Filtración del techo');
  await page
    .getByLabel('Descripción *', { exact: true })
    .fill('El agua cae del techo del pasillo desde esta mañana.');
  await page.getByLabel('Categoría *', { exact: true }).selectOption('1');
  await page.getByLabel('Ubicación *', { exact: true }).selectOption('1');
  await expect(page.locator('#report-unit option')).toHaveText([
    'No corresponde / área común',
    'A-101',
  ]);
  await page.locator('#report-files').setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('MZ'),
  });
  await expect(page.getByRole('alert')).toContainText('no está permitido');
  await page.locator('#report-files').setInputFiles({
    name: 'evidencia.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 prueba'),
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/screenshots/reportar-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Enviar reporte', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('servicio no está disponible');
  await expect(page).toHaveURL(/reportar-incidencia/);
  await expect(page.getByLabel('Descripción *', { exact: true })).toHaveValue(
    'El agua cae del techo del pasillo desde esta mañana.',
  );
  await page.getByRole('button', { name: 'Enviar reporte', exact: true }).click();
  await expect(page.getByText('INC-1-000018', { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/reportar-confirmacion-mobile.png',
    fullPage: true,
  });
});

test('Catálogos permite crear, editar, desactivar, filtrar y reactivar sin borrar el historial', async ({
  page,
}) => {
  await session(page);
  let rows = categories.map((c) => ({ ...c }));
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me/')) return route.fulfill({ json: { user } });
    if (url.pathname.endsWith('/incident-ai/catalogs/')) {
      expect(url.searchParams.get('include_inactive')).toBe('true');
      return route.fulfill({
        json: {
          categories: rows,
          priorities,
          staff_types: [
            { code: 'MAINTENANCE', name: 'Mantenimiento' },
            { code: 'SECURITY', name: 'Seguridad' },
          ],
          can_manage: true,
        },
      });
    }
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      rows[0] = { ...rows[0], ...body };
      return route.fulfill({ json: rows[0] });
    }
    if (route.request().method() === 'POST') {
      const row = { ...route.request().postDataJSON(), id: 2, code: 'FUGAS_AUTO', is_active: true };
      rows.push(row);
      return route.fulfill({ status: 201, json: row });
    }
    return route.fulfill({ json: {} });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/catalogos-incidencias');
  await page.getByRole('button', { name: 'Editar Plomería', exact: true }).click();
  await page.getByLabel('Nombre visible *', { exact: true }).fill('Agua y plomería');
  await page.getByLabel('Equipo responsable predeterminado').selectOption('SECURITY');
  await page.screenshot({ path: 'docs/screenshots/catalogos-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agua y plomería', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar Agua y plomería', exact: true }).click();
  await expect(
    page.getByText('Las incidencias anteriores conservarán sus datos.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar desactivación' }).click();
  await page.getByLabel('Filtrar por estado').selectOption('inactive');
  await page.getByRole('button', { name: 'Activar Agua y plomería', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No encontramos coincidencias' })).toBeVisible();
  await page.getByLabel('Filtrar por estado').selectOption('all');
  await page.getByRole('button', { name: 'Nueva categoría', exact: true }).click();
  await page.getByLabel('Nombre visible *', { exact: true }).fill('Fugas');
  await page.getByRole('button', { name: 'Crear categoría', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fugas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Prioridades/ }).click();
  await page.getByRole('button', { name: 'Editar Alta', exact: true }).click();
  await expect(page.getByLabel('Plazo (minutos)')).toHaveValue('120');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/catalogos-mobile.png', fullPage: true });
});

test('La vista IA tiene su propio espacio y Seguimiento conserva la operación', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { user } });
    if (path.endsWith('/metrics/'))
      return route.fulfill({
        json: { total: 12, pending_review: 3, processing: 1, failed: 2, period_days: 30 },
      });
    if (path.endsWith('/alerts/')) return route.fulfill({ json: [] });
    return route.fulfill({ json: { results: [], pagination: { total_pages: 1 } } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/analisis-incidencias');
  await expect(
    page.getByRole('heading', { name: 'Clasificación con IA', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Actividad IA de los últimos 30 días')).toContainText('12');
  await expect(page.getByText('Del reporte a una decisión informada')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Seguimiento de incidencias' })).toHaveCount(0);
  await page.screenshot({
    path: 'docs/screenshots/analisis-workspace-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/analisis-workspace-mobile.png', fullPage: true });
  await page.goto('/incidencias');
  await expect(
    page.getByRole('heading', { name: 'Seguimiento de incidencias', exact: true }),
  ).toBeVisible();
});
