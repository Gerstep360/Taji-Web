import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { roleOrPermissionGuard } from '../../../core/auth/auth.guard';
import { AuthService } from '../../../core/auth/auth.service';
import { StaffApi } from '../../paquete1_usuarios_condominio/cu07_personal/staff.api';
import { TurnosApi } from './turnos.api';
import { SecurityShift, ShiftListResponse } from './turnos.models';
import { TurnosPage } from './turnos.page';

describe('CU13 Integration & Access Control Tests', () => {
  const turnosApiMock = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    iniciar: vi.fn(),
    cerrar: vi.fn(),
    cancelar: vi.fn(),
    actual: vi.fn(),
    proximos: vi.fn(),
    historial: vi.fn(),
    options: vi.fn(),
  };

  const staffApiMock = {
    list: vi.fn(),
  };

  const routerMock = {
    createUrlTree: vi.fn().mockImplementation((path: string[]) => path.join('/')),
  };

  const sampleShift: SecurityShift = {
    id: 101,
    condominium: 1,
    condominium_name: 'Condominio El Bosque',
    guard_staff: 5,
    guard_name: 'Juan Pérez',
    guard_employee_code: 'SEC-001',
    scheduled_start: '2026-10-05T08:00:00Z',
    scheduled_end: '2026-10-05T16:00:00Z',
    opened_at: null,
    closed_at: null,
    status: 'SCHEDULED',
    opening_notes: '',
    closing_notes: '',
    observation: 'Garita Principal',
    created_by_user: 1,
    created_at: '2026-10-04T10:00:00Z',
    updated_at: '2026-10-04T10:00:00Z',
  };

  const mockListResponse: ShiftListResponse = {
    pagination: { page: 1, page_size: 20, total_items: 1, total_pages: 1, next: null, previous: null },
    results: [sampleShift],
  };

  function setupAuthUser(user: any) {
    const authMock = { user: vi.fn().mockReturnValue(user), isAuthenticated: vi.fn().mockReturnValue(!!user) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TurnosPage],
      providers: [
        { provide: TurnosApi, useValue: turnosApiMock },
        { provide: StaffApi, useValue: staffApiMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    turnosApiMock.list.mockReturnValue(of(mockListResponse));
    turnosApiMock.actual.mockReturnValue(of({ shift: null, message: 'No tienes un turno activo en este momento.' }));
    turnosApiMock.proximos.mockReturnValue(of([sampleShift]));
    turnosApiMock.historial.mockReturnValue(of([]));
    turnosApiMock.options.mockReturnValue(of({ statuses: [] }));
    staffApiMock.list.mockReturnValue(of({ results: [{ id: 5, full_name: 'Juan Pérez', staff_type: 'SECURITY', status: 'ACTIVE' }] }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function guardFixture(shift: SecurityShift) {
    setupAuthUser({ role: { slug: 'seguridad', permissions: [] } });
    turnosApiMock.actual.mockReturnValue(of(shift));
    turnosApiMock.proximos.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    return fixture;
  }

  it('blocks an early start in the UI and does not send it to the API', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(sampleShift.scheduled_start) - 16 * 60_000);
    const fixture = guardFixture(sampleShift);
    const button = fixture.nativeElement.querySelector('.btn-action.start') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Habilitado desde');
    fixture.componentInstance.openConfirm('iniciar', sampleShift);
    expect(fixture.componentInstance.confirmModal().open).toBe(false);
    expect(turnosApiMock.iniciar).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('enables the start automatically at the fifteen-minute boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse(sampleShift.scheduled_start) - 15 * 60_000 - 1000);
    const fixture = guardFixture(sampleShift);
    expect(fixture.nativeElement.querySelector('.btn-action.start').disabled).toBe(true);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-action.start').disabled).toBe(false);
    fixture.destroy();
  });

  it('uses the server clock when the computer clock differs', () => {
    const serverTime = Date.parse(sampleShift.scheduled_start) - 60 * 60_000;
    vi.spyOn(Date, 'now').mockReturnValue(serverTime + 2 * 60 * 60_000);
    const fixture = guardFixture({ ...sampleShift, timing: {
      server_time: new Date(serverTime).toISOString(),
      start_allowed_at: new Date(Date.parse(sampleShift.scheduled_start) - 15 * 60_000).toISOString(),
      can_start: false, start_block_reason: '', other_open_shift_id: null,
      is_overdue: false, is_missed: false, closing_timing: 'EARLY', close_reason_required: false,
    } });
    expect(fixture.componentInstance.serverNow()).toBe(serverTime);
    expect(fixture.nativeElement.querySelector('.btn-action.start').disabled).toBe(true);
    fixture.destroy();
  });

  it('shows a missed shift and prevents starting it at the final time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(sampleShift.scheduled_end));
    const fixture = guardFixture(sampleShift);
    expect(fixture.nativeElement.textContent).toContain('Sin iniciar');
    expect(fixture.nativeElement.querySelector('.btn-action.start').disabled).toBe(true);
    fixture.destroy();
  });

  it('keeps an overdue shift open with its close action and warning', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(sampleShift.scheduled_end) + 60_000);
    const fixture = guardFixture({ ...sampleShift, status: 'OPEN', opened_at: sampleShift.scheduled_start });
    expect(fixture.nativeElement.textContent).toContain('Horario finalizado, cierre pendiente');
    expect(fixture.nativeElement.querySelector('.btn-action.close').disabled).toBe(false);
    expect(turnosApiMock.cerrar).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it.each([-60_000, 60_000])('requires and sends the reason for a closure %s ms from the end', (offset) => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(sampleShift.scheduled_end) + offset);
    const shift: SecurityShift = { ...sampleShift, status: 'OPEN', opened_at: sampleShift.scheduled_start };
    const fixture = guardFixture(shift);
    const page = fixture.componentInstance;
    page.openConfirm('cerrar', shift);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Motivo del cierre (obligatorio)');
    expect(fixture.nativeElement.querySelector('.dialog-footer .btn-primary').disabled).toBe(true);
    page.executeConfirmAction();
    expect(turnosApiMock.cerrar).not.toHaveBeenCalled();
    expect(page.confirmError()).toContain('motivo');
    page.confirmModal.update((modal) => ({ ...modal, notes: '  Permiso / relevo tardío  ' }));
    turnosApiMock.cerrar.mockReturnValue(of({ ...shift, status: 'CLOSED' }));
    page.executeConfirmAction();
    expect(turnosApiMock.cerrar).toHaveBeenCalledWith(shift.id, 'Permiso / relevo tardío');
    fixture.destroy();
  });

  it('shows API validation errors inside the close dialog', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(sampleShift.scheduled_end) + 60_000);
    const shift: SecurityShift = { ...sampleShift, status: 'OPEN' };
    const fixture = guardFixture(shift);
    const page = fixture.componentInstance;
    page.openConfirm('cerrar', shift);
    page.confirmModal.update((modal) => ({ ...modal, notes: 'Motivo' }));
    turnosApiMock.cerrar.mockReturnValue(throwError(() => ({ error: { error: {
      message: 'Revisa los campos indicados.', fields: { notes: ['Motivo inválido.'] },
    } } })));
    page.executeConfirmAction();
    fixture.detectChanges();
    expect(page.confirmModal().open).toBe(true);
    expect(fixture.nativeElement.querySelector('.dialog-body').textContent).toContain('Motivo inválido.');
    fixture.destroy();
  });

  // --- PRUEBAS DE GUARDS Y ACCESO DE RUTAS ---
  it('1. rol Seguridad puede acceder a /turnos-seguridad sin manage_staff ni permisos administrativos manuales', () => {
    const securityUser = { id: 2, full_name: 'Juan Guardia', role: { slug: 'seguridad', permissions: [] } };
    setupAuthUser(securityUser);

    const guardFn = roleOrPermissionGuard(
      ['seguridad', 'guardia', 'security'],
      ['manage_security_shifts', 'operate_security_shifts', 'view_security_shifts']
    );

    const result = TestBed.runInInjectionContext(() => guardFn(undefined as any, undefined as any));
    expect(result).toBe(true);
  });

  it('2. administrador sigue accediendo a la ruta', () => {
    const adminUser = { id: 1, full_name: 'Ana Admin', is_superuser: true, role: { slug: 'administrador', permissions: ['manage_security_shifts'] } };
    setupAuthUser(adminUser);

    const guardFn = roleOrPermissionGuard(
      ['seguridad', 'guardia', 'security'],
      ['manage_security_shifts', 'operate_security_shifts', 'view_security_shifts']
    );

    const result = TestBed.runInInjectionContext(() => guardFn(undefined as any, undefined as any));
    expect(result).toBe(true);
  });

  it('3, 4, 5, 6. residente, mantenimiento y limpieza siguen sin acceso (devuelve 403 / urlTree)', () => {
    const rolesNoAutorizados = ['residente', 'mantenimiento', 'limpieza'];

    for (const slug of rolesNoAutorizados) {
      const user = { id: 99, full_name: 'Usuario Sin Acceso', role: { slug, permissions: [] } };
      setupAuthUser(user);

      const guardFn = roleOrPermissionGuard(
        ['seguridad', 'guardia', 'security'],
        ['manage_security_shifts', 'operate_security_shifts', 'view_security_shifts']
      );

      const result = TestBed.runInInjectionContext(() => guardFn(undefined as any, undefined as any));
      expect(result).not.toBe(true);
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/acceso-denegado']);
    }
  });

  // --- PRUEBAS DE LA VISTA / COMPONENTE ---
  it('1. Seguridad entra a CU13 y NO llama StaffApi.list()', async () => {
    const securityUser = { id: 2, full_name: 'Juan Guardia', role: { slug: 'seguridad', permissions: [] } };
    setupAuthUser(securityUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(staffApiMock.list).not.toHaveBeenCalled();
  });

  it('2. Seguridad llama turnoActual()', async () => {
    const securityUser = { id: 2, full_name: 'Juan Guardia', role: { slug: 'seguridad', permissions: [] } };
    setupAuthUser(securityUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(turnosApiMock.actual).toHaveBeenCalled();
  });

  it('3. Seguridad llama proximos()', async () => {
    const securityUser = { id: 2, full_name: 'Juan Guardia', role: { slug: 'seguridad', permissions: [] } };
    setupAuthUser(securityUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(turnosApiMock.proximos).toHaveBeenCalled();
  });

  it('4. Seguridad llama historial() cuando activa la pestaña historial', async () => {
    const securityUser = { id: 2, full_name: 'Juan Guardia', role: { slug: 'seguridad', permissions: [] } };
    setupAuthUser(securityUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.setTab('historial');
    expect(turnosApiMock.historial).toHaveBeenCalled();
  });

  it('5. Admin sí llama StaffApi.list() al entrar', async () => {
    const adminUser = { id: 1, full_name: 'Ana Admin', is_superuser: true, role: { slug: 'administrador', permissions: ['manage_security_shifts'] } };
    setupAuthUser(adminUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(staffApiMock.list).toHaveBeenCalled();
  });

  it('6. Seguridad no ve controles administrativos', async () => {
    const securityUser = { id: 2, full_name: 'Juan Guardia', role: { slug: 'seguridad', permissions: [] } };
    setupAuthUser(securityUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const html = fixture.nativeElement.innerHTML as string;
    expect(html).not.toContain('Nuevo turno');
    expect(html).not.toContain('Gestión de Turnos');
  });

  it('7. Admin mantiene controles administrativos', async () => {
    const adminUser = { id: 1, full_name: 'Ana Admin', is_superuser: true, role: { slug: 'administrador', permissions: ['manage_security_shifts'] } };
    setupAuthUser(adminUser);

    const fixture = TestBed.createComponent(TurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const html = fixture.nativeElement.innerHTML as string;
    expect(html).toContain('Nuevo turno');
    expect(html).toContain('Gestión de Turnos');
  });
});

