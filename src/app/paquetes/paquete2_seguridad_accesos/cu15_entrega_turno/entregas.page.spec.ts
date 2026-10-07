import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../core/api/api-client.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StaffApi } from '../../paquete1_usuarios_condominio/cu07_personal/staff.api';
import { SecurityShift } from '../cu13_turnos_seguridad/turnos.models';
import { EntregasApi, Handover, HandoverPage } from './entregas.api';
import { EntregasPage } from './entregas.page';

const outgoing: SecurityShift = { id: 1, condominium: 1, condominium_name: 'Bosque', guard_staff: 2, guard_name: 'Davidson',
  guard_employee_code: 'SEC-001', scheduled_start: '2026-10-06T08:00:00-04:00', scheduled_end: '2026-10-06T16:00:00-04:00',
  opened_at: '2026-10-06T08:00:00-04:00', closed_at: null, status: 'OPEN', opening_notes: '', closing_notes: '', observation: '',
  created_by_user: 1, created_at: '2026-10-06T08:00:00-04:00', updated_at: '2026-10-06T08:00:00-04:00' };
const handover: Handover = { id: 5, outgoing_shift: 1, incoming_shift: 3, outgoing_detail: outgoing,
  incoming_detail: { ...outgoing, id: 3, guard_name: 'Marco' }, summary: 'Revisar portón', delivered_by_user: 2,
  received_by_user: null, delivered_at: '2026-10-06T16:00:00-04:00', received_at: null, status: 'PENDING', log_entries: [] };
const response: HandoverPage = { results: [handover], pagination: { page: 1, total_pages: 2, total_items: 21 } };

describe('CU15 consulta web', () => {
  const api = { list: vi.fn(), detail: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks(); api.list.mockReturnValue(of(response)); api.detail.mockReturnValue(of(handover));
    TestBed.configureTestingModule({ imports: [EntregasPage], providers: [provideRouter([]), { provide: EntregasApi, useValue: api },
      { provide: AuthService, useValue: { user: () => ({ role: { slug: 'administrador', permissions: [] } }) } },
      { provide: StaffApi, useValue: { list: () => of({ results: [] }) } },
    ] });
  });
  function fixture() { const f = TestBed.createComponent(EntregasPage); f.detectChanges(); return f; }
  it('muestra guardias y pendientes sin acciones administrativas de entrega o recepción', () => {
    const f = fixture(); const text = f.nativeElement.textContent;
    expect(text).toContain('Davidson'); expect(text).toContain('Marco'); expect(text).toContain('Pendiente de recepción');
    expect(text).not.toContain('Confirmar recepción'); expect(f.nativeElement.querySelector('textarea')).toBeNull();
  });
  it('consulta resumen y novedades de la entrega', () => {
    const f = fixture(); f.componentInstance.detail(5); f.detectChanges();
    expect(api.detail).toHaveBeenCalledWith(5); expect(f.nativeElement.textContent).toContain('Revisar portón');
    expect(f.nativeElement.textContent).toContain('No había novedades registradas al entregar.');
  });
  it('envía filtros y página sin modificar turnos', () => {
    const p = fixture().componentInstance; p.guard = '2'; p.condominium = '1'; p.status = 'PENDING'; p.dateFrom = '2026-10-06'; p.load(2);
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, guard: '2', condominium: '1', status: 'PENDING', date_from: '2026-10-06' }));
  });
  it('valida fechas y presenta errores recuperables', () => {
    const p = fixture().componentInstance; p.dateFrom = '2026-10-07'; p.dateTo = '2026-10-06'; p.load();
    expect(api.list).toHaveBeenCalledTimes(1); expect(p.error()).toContain('anterior');
    p.dateFrom = ''; p.dateTo = ''; api.list.mockReturnValueOnce(throwError(() => ({ error: { error: { message: 'Sin conexión' } } })));
    p.load(); expect(p.error()).toBe('Sin conexión'); expect(p.loading()).toBe(false); p.load(); expect(p.error()).toBe('');
  });
  it('no reemplaza un detalle nuevo con una respuesta anterior lenta', () => {
    const delayed = new Subject<Handover>(); api.detail.mockReturnValueOnce(delayed);
    const p = fixture().componentInstance; p.detail(5); api.detail.mockReturnValueOnce(of({ ...handover, id: 6 })); p.detail(6);
    delayed.next(handover); expect(p.selected()?.id).toBe(6);
  });
  it('muestra la fecha de recepción confirmada', () => {
    api.list.mockReturnValueOnce(of({ ...response, results: [{ ...handover, status: 'RECEIVED', received_at: '2026-10-06T16:02:00-04:00', received_by_user: 3 }] }));
    const f = fixture(); expect(f.nativeElement.textContent).toContain('Recibida'); expect(f.nativeElement.textContent).not.toContain('Recepción pendiente');
  });
});
describe('CU15 API', () => {
  it('usa endpoints centralizados y omite filtros vacíos', () => {
    const get = vi.fn().mockReturnValue(of(response));
    TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: { get } }] });
    const api = TestBed.inject(EntregasApi); api.list({ page: 2, status: 'PENDING', guard: '' }).subscribe();
    expect(get.mock.calls[0][0]).toBe('/paquete2/entregas-turno/'); expect(get.mock.calls[0][1].params.has('guard')).toBe(false);
    expect(get.mock.calls[0][1].params.get('status')).toBe('PENDING'); api.detail(5).subscribe();
    expect(get).toHaveBeenLastCalledWith('/paquete2/entregas-turno/5/');
  });
});
