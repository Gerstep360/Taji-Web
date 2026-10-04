import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

