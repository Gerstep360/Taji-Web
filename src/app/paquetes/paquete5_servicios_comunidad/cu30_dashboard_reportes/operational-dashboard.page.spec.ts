import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { routes } from '../../../app.routes';
import { AppConfigService } from '../../../core/api/app-config.service';
import { User } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ReportsPage as ConsultaReportsPage } from '../../paquete6_reportes_analitica/cu31_reportes/reports.page';
import { ReportsPage as CustomReportsPage } from '../reportes/reportes.page';
import { DashboardPage } from './dashboard.page';
import { OperationalDashboard } from './operational-dashboard.api';
import { OperationalDashboardPage } from './operational-dashboard.page';

const endpoint = '/api/v1/paquete5/cu30/dashboard/';

function account(tenant: number | null, slug = 'administrador', superuser = false): User {
  return {
    id: 42, email: 'prueba@example.test', first_name: 'Ana', last_name: 'Prueba',
    full_name: 'Ana Prueba', phone: '', date_joined: '', is_approved: true, is_superuser: superuser,
    role: { slug, name: slug, description: '', permissions: [] },
    active_tenant: tenant === null ? null : { id: tenant, name: 'Condominio ' + tenant, slug: 'demo-' + tenant },
  };
}

function payload(id = 1, count = 7): OperationalDashboard {
  const daily = [{ date: '2026-11-01', count }, { date: '2026-11-02', count: 0 }];
  const domain = { total: count, date_field: 'created_at', daily };
  const common = { ...domain, pending: count, by_status: [{ key: 'PENDING', label: 'Pendiente', count }] };
  return {
    context: { mode: 'condominium', id, name: 'Condominio ' + id, timezone: 'America/La_Paz' },
    period: { date_from: '2026-11-01', date_to: '2026-11-02', as_of: '2026-11-02T01:00:00Z' },
    unit: 'records', has_data: count > 0,
    security: {
      ...domain, date_field: 'occurred_at', entries: count, exits: 0, denied: 0,
      by_type: [{ key: 'ENTRY', label: 'Entrada', count }],
      by_result: [{ key: 'APPROVED', label: 'Aprobado', count }],
    },
    incidents: { ...common, resolved: 0, by_priority: [{ key: 'HIGH', label: 'Alta', count }] },
    maintenance: { ...common, in_progress: 0, completed: 0, overdue: count },
    reservations: {
      ...common, date_field: 'start_at', approved: 0, rejected: 0, cancelled: 0, completed: 0,
      by_area: [{ key: '1', label: 'Área común A', count }],
    },
  };
}

describe('T084 Dashboard operativo', () => {
  let fixture: ComponentFixture<OperationalDashboardPage>;
  let http: HttpTestingController;
  const user = signal<User | null>(null);

  beforeEach(() => {
    user.set(account(1));
    TestBed.configureTestingModule({
      imports: [OperationalDashboardPage],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            user,
            activeTenant: () => user()?.active_tenant ?? null,
            restoreSession: async () => {},
          },
        },
        {
          provide: AppConfigService,
          useValue: { endpoint: (path: string) => '/api/v1' + path, config: () => ({ requestTimeoutMs: 12000 }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OperationalDashboardPage);
  });

  afterEach(() => http.verify());

  function request() {
    return http.expectOne((req) => req.url === endpoint && req.method === 'GET');
  }

  function text() {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('carga con el tenant de sesión y representa indicadores y gráficos del contrato', () => {
    fixture.detectChanges();
    expect(text()).toContain('Cargando indicadores');
    const req = request();
    expect(req.request.headers.get('X-Tenant-ID')).toBe('1');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(payload());
    fixture.detectChanges();
    expect(text()).toContain('Órdenes con programación atrasada');
    expect(text()).toContain('Área común A');
    expect(text()).toContain('Alta');
    expect(fixture.nativeElement.querySelectorAll('.summary-card')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('.daily-plot span').style.height).toBe('100%');
  });

  it('envía fechas ISO válidas solo al aplicar y actualiza el período', () => {
    fixture.detectChanges();
    request().flush(payload());
    const page = fixture.componentInstance;
    page.edit('date_from', '2025-11-02');
    page.edit('date_to', '2026-11-02');
    http.expectNone(endpoint);
    page.apply(new Event('submit'));
    fixture.detectChanges();
    const req = request();
    expect(req.request.params.get('date_from')).toBe('2025-11-02');
    expect(req.request.params.get('date_to')).toBe('2026-11-02');
    req.flush(payload());
    fixture.detectChanges();
    expect(text()).toContain('Período consultado');
  });

  it.each([
    ['2026-11-03', '2026-11-02'],
    ['2025-11-01', '2026-11-02'],
    ['2026-02-30', '2026-03-01'],
  ])('rechaza el período inválido %s a %s', (start, end) => {
    fixture.detectChanges();
    request().flush(payload());
    fixture.componentInstance.edit('date_from', start);
    fixture.componentInstance.edit('date_to', end);
    fixture.componentInstance.apply(new Event('submit'));
    fixture.detectChanges();
    expect(text()).toContain('hasta 366 días');
    http.expectNone(endpoint);
  });

  it('muestra el estado vacío sin gráficos', () => {
    fixture.detectChanges();
    request().flush(payload(1, 0));
    fixture.detectChanges();
    expect(text()).toContain('Sin registros en este período');
    expect(fixture.nativeElement.querySelector('.daily-plot')).toBeNull();
  });

  it.each([
    [400, 'El período no es válido'],
    [401, 'Tu sesión venció'],
    [403, 'No tienes acceso al dashboard'],
    [0, 'No pudimos conectar'],
  ] as const)('gestiona el error %s sin datos previos ni mensajes internos', (status, message) => {
    fixture.detectChanges();
    request().flush(payload());
    fixture.componentInstance.refresh();
    fixture.detectChanges();
    const req = request();
    if (status === 0) req.error(new ProgressEvent('network'));
    else req.flush({ detail: 'Dato interno del condominio' }, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(text()).toContain(message);
    expect(text()).not.toContain('Dato interno');
    expect(fixture.nativeElement.querySelector('.summary-card')).toBeNull();
  });

  it('oculta los resultados inmediatamente y cancela la consulta al cambiar de tenant', () => {
    fixture.detectChanges();
    request().flush(payload());
    expect(fixture.componentInstance.data()?.context.id).toBe(1);
    user.set(account(2));
    expect(fixture.componentInstance.data()).toBeNull();
    fixture.detectChanges();
    const pending = request();
    expect(pending.request.headers.get('X-Tenant-ID')).toBe('2');
    user.set(account(3));
    fixture.detectChanges();
    expect(pending.cancelled).toBe(true);
    const current = request();
    expect(current.request.headers.get('X-Tenant-ID')).toBe('3');
    current.flush(payload(3));
    fixture.detectChanges();
    expect(text()).toContain('Condominio 3');
    expect(text()).not.toContain('Condominio 1');
  });

  it('descarta una respuesta tardía incluso antes de que se ejecute la cancelación', () => {
    fixture.detectChanges();
    const old = request();
    user.set(account(2));
    old.flush(payload(1));
    expect(fixture.componentInstance.data()).toBeNull();
    fixture.detectChanges();
    request().flush(payload(2));
    expect(fixture.componentInstance.data()?.context.id).toBe(2);
  });

  it('rechaza una respuesta que declara un contexto distinto al solicitado', () => {
    fixture.detectChanges();
    request().flush(payload(2));
    fixture.detectChanges();
    expect(text()).toContain('El contexto operativo no está disponible');
    expect(fixture.componentInstance.data()).toBeNull();
  });

  it('superusuario global no solicita métricas', () => {
    user.set(account(null, 'administrador', true));
    fixture.detectChanges();
    http.expectNone(endpoint);
    expect(text()).toContain('Establece un contexto de condominio autorizado');
  });

  it('superusuario con tenant activo envía el contexto autorizado de sesión', () => {
    user.set(account(2, 'administrador', true));
    fixture.detectChanges();
    const req = request();
    expect(req.request.headers.get('X-Tenant-ID')).toBe('2');
    req.flush(payload(2));
    fixture.detectChanges();
    expect(text()).toContain('Condominio 2');
  });

  it('un rol sin acceso no consulta T056', () => {
    user.set(account(1, 'residente'));
    fixture.detectChanges();
    http.expectNone(endpoint);
    expect(text()).toContain('No tienes acceso al dashboard operativo');
  });

  it('no muestra el selector de condominio a administradores ordinarios', () => {
    user.set(account(1, 'administrador', false));
    fixture.detectChanges();
    request().flush(payload(1));
    fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector('.tenant-selector');
    expect(selector).toBeNull();
  });

  it('muestra el selector de condominio exclusivamente a superusuarios', () => {
    const superUser = account(1, 'administrador', true);
    superUser.available_tenants = [
      { id: 1, name: 'Condominio 1', slug: 'demo-1' },
      { id: 2, name: 'Condominio 2', slug: 'demo-2' },
    ];
    user.set(superUser);
    fixture.detectChanges();
    request().flush(payload(1));
    fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector('.tenant-selector') as HTMLSelectElement | null;
    expect(selector).not.toBeNull();
    expect(selector?.options.length).toBe(2);
  });

  it('mantiene las rutas previas y registra una ruta separada para T084', async () => {
    user.set(null);
    const children = routes.find((route) => route.path === '' && route.children)?.children ?? [];
    const component = async (path: string) => {
      const loader = children.find((route) => route.path === path)?.loadComponent;
      return loader ? await Promise.resolve(loader()) : null;
    };
    expect(await component('inicio')).toBe(DashboardPage);
    expect(await component('reportes')).toBe(ConsultaReportsPage);
    expect(await component('reportes-personalizables')).toBe(CustomReportsPage);
    expect(await component('dashboard-reportes')).toBe(OperationalDashboardPage);
  });
});
