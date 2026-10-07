import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiClient } from '../../../core/api/api-client.service';
import { StaffApi } from '../../paquete1_usuarios_condominio/cu07_personal/staff.api';
import { NovedadesApi } from './novedades.api';
import { ShiftLogPage } from './novedades.models';
import { NovedadesPage } from './novedades.page';

const result: ShiftLogPage = { pagination: { page: 1, total_pages: 2, total_items: 21 }, results: [{
  id: 1, shift: 10, guard_staff: 2, guard_name: 'Davidson', condominium: 1, condominium_name: 'Bosque',
  shift_status: 'CLOSED', scheduled_start: '2026-10-06T08:00:00-04:00', scheduled_end: '2026-10-06T16:00:00-04:00',
  created_by_user: 2, entry_type: 'ALERT', severity: 'HIGH', title: 'Portón abierto', description: 'Revisar el cierre.',
  occurred_at: '2026-10-06T12:00:00-04:00', created_at: '2026-10-06T12:00:00-04:00',
}] };

describe('CU14 consulta de novedades', () => {
  const api = { list: vi.fn() };
  const staff = { list: vi.fn() };
  let role = 'administrador';
  beforeEach(() => {
    role = 'administrador';
    vi.resetAllMocks();
    api.list.mockReturnValue(of(result));
    staff.list.mockReturnValue(of({ results: [] }));
    TestBed.configureTestingModule({ imports: [NovedadesPage], providers: [provideRouter([]),
      { provide: NovedadesApi, useValue: api }, { provide: StaffApi, useValue: staff },
      { provide: AuthService, useValue: { user: () => ({ role: { slug: role, permissions: [] } }) } },
    ] });
  });
  function fixture() { const f = TestBed.createComponent(NovedadesPage); f.detectChanges(); return f; }
  it('muestra identidad, prioridad, descripción e historial sin edición', () => {
    const f = fixture();
    const text = f.nativeElement.textContent;
    expect(text).toContain('Portón abierto'); expect(text).toContain('Davidson');
    expect(text).toContain('Revisar el cierre.'); expect(text).toContain('Alta');
    expect(f.componentInstance.pages()).toBe(2);
    expect(f.nativeElement.querySelector('textarea')).toBeNull();
  });
  it('envía filtros y página al servidor', () => {
    const p = fixture().componentInstance;
    p.guard = '2'; p.shift = '10'; p.type = 'ALERT'; p.severity = 'HIGH'; p.dateFrom = '2026-10-06';
    p.search = ' portón '; p.load(2);
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, guard: '2', shift: '10', entry_type: 'ALERT', severity: 'HIGH', date_from: '2026-10-06', search: 'portón' }));
  });
  it('bloquea rango de fechas invertido', () => {
    const p = fixture().componentInstance;
    p.dateFrom = '2026-10-07'; p.dateTo = '2026-10-06'; p.load();
    expect(api.list).toHaveBeenCalledTimes(1); expect(p.error()).toContain('anterior');
  });
  it('presenta errores y permite reintentar', () => {
    api.list.mockReturnValueOnce(throwError(() => ({ error: { error: { message: 'Conexión perdida' } } })));
    const p = fixture().componentInstance;
    expect(p.error()).toBe('Conexión perdida'); expect(p.loading()).toBe(false);
    p.load(); expect(p.entries()).toHaveLength(1); expect(p.error()).toBe('');
  });
  it('una respuesta vieja no reemplaza una búsqueda reciente', () => {
    const first = new Subject<ShiftLogPage>();
    api.list.mockReturnValueOnce(first);
    const p = fixture().componentInstance;
    p.search = 'nuevo'; p.load(); first.next({ ...result, results: [] });
    expect(p.entries()).toHaveLength(1);
  });
  it('el guardia no consulta el catálogo administrativo de personal', () => {
    role = 'seguridad'; fixture(); expect(staff.list).not.toHaveBeenCalled();
  });
});

describe('CU14 API', () => {
  it('centraliza ruta y omite filtros vacíos', () => {
    const get = vi.fn().mockReturnValue(of(result));
    TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: { get } }] });
    TestBed.inject(NovedadesApi).list({ page: 2, guard: '', entry_type: 'ALERT' }).subscribe();
    const [path, options] = get.mock.calls[0];
    expect(path).toBe('/paquete2/novedades-turno/');
    expect(options.params.get('page')).toBe('2'); expect(options.params.has('guard')).toBe(false);
    expect(options.params.get('entry_type')).toBe('ALERT');
  });
});
