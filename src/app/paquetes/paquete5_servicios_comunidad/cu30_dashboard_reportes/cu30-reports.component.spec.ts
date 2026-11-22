import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfigService } from '../../../core/api/app-config.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ReportCatalog, ReportPreview, ReportSource } from './cu30-reports.api';
import { Cu30ReportsComponent } from './cu30-reports.component';
import { OperationalDashboardPage } from './operational-dashboard.page';

const base = '/api/v1/paquete5/cu30/reports/';
const source: ReportSource = {
  key: 'audit_events', label: 'Auditoría', description: 'Cambios del condominio', date_field: 'occurred_at',
  permissions_any: ['manage_roles'], sortable: ['action_code', 'occurred_at'],
  columns: [
    { key: 'action_code', label: 'Acción', type: 'text', choices: [], operators: ['contains', 'eq'] },
    { key: 'occurred_at', label: 'Fecha', type: 'datetime', choices: [], operators: ['eq', 'gte'] },
  ],
  default_columns: ['action_code', 'occurred_at'],
  default_ordering: [{ field: 'occurred_at', direction: 'desc' }],
  formats: ['xlsx', 'csv'],
};
const period = { date_from: '2026-11-01', date_to: '2026-11-22', timezone: 'America/La_Paz' };

function context(id: number) {
  return { id, name: 'Condominio ' + id, timezone: period.timezone, mode: 'condominium' as const };
}

function user(tenant: number | null, superuser = false, role = 'administrador', id = 1) {
  return { id, is_superuser: superuser, role: { slug: role }, active_tenant: tenant === null ? null : context(tenant) };
}

function catalog(tenant = 1): ReportCatalog {
  return { context: context(tenant), sources: [source], formats: ['xlsx', 'csv', 'pdf'], export_limits: { xlsx: 5000, csv: 5000 } };
}

function preview(page = 1, total = 3): ReportPreview {
  return {
    source: source.key, title: source.label, period, columns: [source.columns[0]],
    pagination: { total, page, page_size: 1, pages: Math.max(1, total) },
    rows: total ? [['cu30.audit.' + page]] : [],
    can_export: { xlsx: true, csv: false, pdf: true },
  };
}

describe('T099 Reportes detallados', () => {
  const identity = signal(user(1));
  let fixture: ComponentFixture<Cu30ReportsComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    identity.set(user(1));
    TestBed.configureTestingModule({
      imports: [Cu30ReportsComponent, OperationalDashboardPage],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: identity, activeTenant: () => identity().active_tenant } },
        { provide: AppConfigService, useValue: { endpoint: (path: string) => '/api/v1' + path, config: () => ({ requestTimeoutMs: 10000 }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Cu30ReportsComponent);
    fixture.componentRef.setInput('contextKey', '1:1');
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function start() {
    fixture.detectChanges();
    http.expectOne(base + 'catalog/').flush(catalog());
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function submit() { fixture.componentInstance.apply(new Event('submit')); }
  function rendered() { return (fixture.nativeElement as HTMLElement).textContent ?? ''; }

  it('usa solo el catálogo autorizado, selecciona columnas y construye los filtros y la ordenación', () => {
    const page = start();
    expect(fixture.nativeElement.querySelector('select').options.length).toBe(1);
    page.toggleColumn('occurred_at', false);
    page.addFilter();
    page.editFilter(0, 'value', 'cu30.');
    page.editOrder(0, 'direction', 'asc');
    page.setPageSize('10');
    submit();
    const req = http.expectOne(base + 'preview/');
    expect(req.request.headers.get('X-Tenant-ID')).toBe('1');
    expect(req.request.body).toEqual({
      source: 'audit_events', columns: ['action_code'],
      filters: [{ field: 'action_code', operator: 'contains', value: 'cu30.' }],
      ordering: [{ field: 'occurred_at', direction: 'asc' }], page: 1, page_size: 10,
    });
    req.flush(preview());
    fixture.detectChanges();
    expect(rendered()).toContain('cu30.audit.1');
    expect(rendered()).toContain('Excel');
    expect(rendered()).toContain('CSV admite hasta 5000 filas');
    expect(rendered()).not.toContain('Exportar PDF');
  });

  it('página y descarga con la consulta aplicada y fija las fechas efectivas devueltas', () => {
    const page = start();
    submit();
    http.expectOne(base + 'preview/').flush(preview());
    page.goTo(2);
    const next = http.expectOne(base + 'preview/');
    expect(next.request.body).toMatchObject({ page: 2, date_from: period.date_from, date_to: period.date_to });
    next.flush(preview(2));
    const create = vi.fn(() => 'blob:test');
    const revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = create;
      static override revokeObjectURL = revoke;
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('cu30-audit_events.xlsx');
    });
    page.download('pdf');
    page.download('csv');
    http.expectNone(base + 'export/');
    page.download('xlsx');
    const download = http.expectOne(base + 'export/');
    expect(download.request.responseType).toBe('blob');
    expect(download.request.body).toEqual({ ...next.request.body, format: 'xlsx' });
    download.flush(new Blob(['xlsx']));
    expect(click).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    page.toggleColumn('occurred_at', false);
    page.download('xlsx');
    http.expectNone(base + 'export/');
  });

  it('permite ver y exportar un reporte vacío', () => {
    start();
    submit();
    http.expectOne(base + 'preview/').flush(preview(1, 0));
    fixture.detectChanges();
    expect(rendered()).toContain('Sin registros para los filtros aplicados');
    expect(rendered()).toContain('Exportar Excel');
  });

  it.each([[400, 'Revisa el período'], [401, 'Tu sesión venció'], [403, 'No tienes acceso']] as const)(
    'trata %i sin mostrar el mensaje interno', (status, message) => {
      const page = start();
      submit();
      http.expectOne(base + 'preview/').flush({ detail: 'tenant interno' }, { status, statusText: 'Error' });
      fixture.detectChanges();
      expect(rendered()).toContain(message);
      expect(rendered()).not.toContain('tenant interno');
      expect(page.result()).toBeNull();
      if (status !== 400) expect(page.catalog()).toBeNull();
    },
  );

  it('descarta resultados tardíos de otra sesión y cancela el trabajo pendiente', () => {
    const page = start();
    submit();
    const late = http.expectOne(base + 'preview/');
    identity.set(user(1, false, 'administrador', 2));
    late.flush(preview());
    expect(page.result()).toBeNull();
    fixture.detectChanges();
    expect(page.catalog()).toBeNull();
    fixture.componentRef.setInput('contextKey', '2:1');
    fixture.detectChanges();
    const pending = http.expectOne(base + 'catalog/');
    identity.set(user(2, false, 'administrador', 2));
    fixture.detectChanges();
    expect(pending.cancelled).toBe(true);
    expect(rendered()).not.toContain('Auditoría');
  });

  it('cancela una descarga al cambiar de condominio', () => {
    const page = start();
    submit();
    http.expectOne(base + 'preview/').flush(preview());
    page.download('xlsx');
    const pending = http.expectOne(base + 'export/');
    identity.set(user(2));
    fixture.detectChanges();
    expect(pending.cancelled).toBe(true);
    expect(page.result()).toBeNull();
    expect(page.filters()).toEqual([]);
  });

  it('bloquea el rol no autorizado y al superusuario sin contexto, y acepta el contexto activo', () => {
    identity.set(user(1, false, 'residente'));
    fixture.detectChanges();
    http.expectNone(base + 'catalog/');
    identity.set(user(null, true));
    fixture.detectChanges();
    http.expectNone(base + 'catalog/');
    identity.set(user(2, true));
    fixture.componentRef.setInput('contextKey', '1:2');
    fixture.detectChanges();
    const req = http.expectOne(base + 'catalog/');
    expect(req.request.headers.get('X-Tenant-ID')).toBe('2');
    req.flush(catalog(2));
    fixture.detectChanges();
    expect(rendered()).toContain('Condominio 2');
  });

  it('mantiene Reportes detallados disponible con el resumen operativo vacío', () => {
    fixture.destroy();
    const parent = TestBed.createComponent(OperationalDashboardPage);
    parent.detectChanges();
    http.expectOne('/api/v1/paquete5/cu30/dashboard/').flush({
      context: context(1), period: { ...period, as_of: '2026-11-22T00:00:00Z' }, has_data: false,
    });
    parent.detectChanges();
    expect(parent.nativeElement.textContent).toContain('Sin registros en este período');
    parent.componentInstance.section.set('reports');
    parent.detectChanges();
    http.expectOne(base + 'catalog/').flush(catalog());
    parent.detectChanges();
    expect(parent.nativeElement.textContent).toContain('Reportes detallados');
  });
});
