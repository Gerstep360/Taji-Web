import { expect, test } from '@playwright/test';

test.use({ channel: 'msedge', reducedMotion: 'reduce' });
// Bitmap diagnóstico (no fotografía real ni datos personales).
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAE0lEQVR4nGNs2nGTAQaY4Cx0DgBNBAIZj7c8+wAAAABJRU5ErkJggg==',
  'base64',
);
const code = 'INC-1-000022';
const base = `http://localhost:4201/api/v1/paquete3/incidents/${code}/`;
const attachments = [42, 43].map((id) => ({
  id,
  file_type: 'IMAGE',
  file_type_display: 'Imagen',
  caption: id === 42 ? 'Evidencia del pasillo' : 'Segunda vista del reporte',
  preview_url: `${base}attachments/${id}/preview/`,
  file_url: `${base}attachments/${id}/download/`,
}));
const detail = {
  public_code: code,
  title: 'Evidencias del pasillo',
  description: 'Revisar las fotos del pasillo y el informe adjunto.',
  status: 'REPORTED',
  status_display: 'Reportada',
  category: { name: 'Seguridad' },
  priority: { name: 'Crítica' },
  current_assignee: null,
  status_history: [],
  public_comments: [],
  internal_comments: [],
  assignments: [],
  attachments: [
    ...attachments,
    {
      id: 44,
      file_type: 'DOCUMENT',
      file_type_display: 'Documento',
      caption: 'Informe de portería',
      file_url: `${base}attachments/44/download/`,
    },
  ],
  can_modify_target_date: false,
  can_view_internal_comments: false,
  can_post_internal_comments: false,
};

for (const routeName of ['incidencias', 'analisis-incidencias']) {
  test(`Fotos visibles y ampliables en ${routeName}, escritorio y móvil`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('taji.auth.has-session', '1'));
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/preview/')) return route.fulfill({ contentType: 'image/png', body: png });
      if (path.endsWith('/auth/me/'))
        return route.fulfill({
          json: {
            user: {
              id: 1,
              email: 'test@taji.local',
              full_name: 'Ana Administración',
              first_name: 'Ana',
              is_superuser: true,
              is_approved: true,
              role: {
                slug: 'administrador',
                name: 'Administración',
                permissions: ['manage_incidents'],
              },
              active_tenant: { id: 1, name: 'Taji' },
            },
          },
        });
      if (path.endsWith('/ai/'))
        return route.fulfill({
          json: {
            processor: { available: true },
            analyses: [],
            can_analyze: true,
            can_review: true,
          },
        });
      if (path.endsWith('/catalogs/'))
        return route.fulfill({ json: { categories: [], priorities: [], can_manage: true } });
      if (path.endsWith('/metrics/'))
        return route.fulfill({ json: { total: 1, pending_review: 0, processing: 0, failed: 0 } });
      if (
        path.endsWith('/alerts/') ||
        path.endsWith('/transitions/') ||
        path.endsWith('/assignees/')
      )
        return route.fulfill({ json: [] });
      if (path.endsWith(`/${code}/`)) return route.fulfill({ json: detail });
      return route.fulfill({ json: { results: [detail], pagination: { total_pages: 1 } } });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/${routeName}?codigo=${code}`);
    const image = page.getByRole('button', { name: 'Ampliar foto #42', exact: true });
    await image.scrollIntoViewIfNeeded();
    await expect(image.locator('img')).toBeVisible();
    await expect
      .poll(() => image.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'Descargar documento' })).toBeVisible();
    await image.click();
    const dialog = page.getByRole('dialog', { name: 'Imagen de evidencia ampliada' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Segunda vista del reporte' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Siguiente', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(image).toBeFocused();
    await page.evaluate(() => scrollTo(0, 0));
    await page.mouse.move(1400, 0);
    await page.screenshot({
      path: `docs/screenshots/${routeName}-galeria-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await image.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `docs/screenshots/${routeName}-galeria-mobile.png`,
      fullPage: true,
    });
    await image.click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.getBoundingClientRect().right <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Cerrar imagen ampliada' }).click();
    await expect(image).toBeFocused();
  });
}
