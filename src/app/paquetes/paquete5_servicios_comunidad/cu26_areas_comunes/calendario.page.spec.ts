import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { AreasApi } from './areas.api';
import { CalendarioPage } from './calendario.page';
import { AreaBlock, AreaSchedule, CommonArea, Reservation } from './areas.models';

describe('CalendarioPage (CU26)', () => {
  const adminUser = signal<Record<string, unknown>>({
    is_superuser: true,
    active_tenant: { id: 1 },
    role: { slug: 'administrador', permissions: ['manage_reservations'] },
  });

  const area: CommonArea = {
    id: 1,
    name: 'Piscina',
    capacity: 30,
    status: 'AVAILABLE',
    description: '',
    requires_approval: false,
    sector: null,
  };
  const schedule: AreaSchedule = {
    id: 1,
    common_area: 1,
    weekday: 5,
    opens_at: '08:00:00',
    closes_at: '12:00:00',
    is_active: true,
  };
  const block: AreaBlock = {
    id: 1,
    common_area: 1,
    work_order: null,
    blocked_from: '2026-11-20T08:00:00.000Z',
    blocked_until: '2026-11-22T18:00:00.000Z',
    reason: 'Mantenimiento',
    created_by_user: null,
    created_at: '2026-11-10T00:00:00.000Z',
  };
  const reservation: Reservation = {
    id: 1,
    common_area: 1,
    common_area_name: 'Piscina',
    resident: 9,
    resident_name: 'Ana Mercado (2-B)',
    start_at: '2026-11-15T10:00:00.000Z',
    end_at: '2026-11-15T12:00:00.000Z',
    status: 'APPROVED',
    purpose: 'Cumpleaños',
    created_at: '2026-11-01T00:00:00.000Z',
  };

  const api = {
    listAreas: vi.fn(),
    listSchedules: vi.fn(),
    listBlocks: vi.fn(),
    listReservations: vi.fn(),
    createArea: vi.fn(),
    updateArea: vi.fn(),
    setAreaStatus: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    createBlock: vi.fn(),
    updateBlock: vi.fn(),
    deleteBlock: vi.fn(),
  };

  function setup(
    userValue: Record<string, unknown>,
    configureApi?: (apiMock: typeof api) => void,
  ) {
    TestBed.resetTestingModule();
    adminUser.set(userValue);
    vi.clearAllMocks();
    api.listAreas.mockReturnValue(of([area]));
    api.listSchedules.mockReturnValue(of([schedule]));
    api.listBlocks.mockReturnValue(of([block]));
    api.listReservations.mockReturnValue(of([reservation]));
    configureApi?.(api);

    TestBed.configureTestingModule({
      imports: [CalendarioPage],
      providers: [
        { provide: AreasApi, useValue: api },
        { provide: AuthService, useValue: { user: adminUser } },
      ],
    });
    const fixture = TestBed.createComponent(CalendarioPage);
    fixture.detectChanges();
    return fixture;
  }

  it('carga áreas, horarios, bloqueos y reservas desde la API al iniciar', async () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: ['manage_reservations'] },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.listAreas).toHaveBeenCalledTimes(1);
    expect(api.listSchedules).toHaveBeenCalledTimes(1);
    expect(api.listBlocks).toHaveBeenCalledTimes(1);
    expect(api.listReservations).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.areas()).toEqual([area]);
    expect(fixture.componentInstance.schedulesForArea()).toEqual([schedule]);
    expect(fixture.componentInstance.reservations()).toEqual([reservation]);
  });

  it('expone modo administrador solo con superusuario o manage_reservations', async () => {
    const admin = setup({
      is_superuser: false,
      active_tenant: { id: 1 },
      role: { slug: 'residente', permissions: ['manage_reservations'] },
    });
    await admin.whenStable();
    expect(admin.componentInstance.canManage()).toBe(true);

    const reader = setup({
      is_superuser: false,
      active_tenant: { id: 1 },
      role: { slug: 'residente', permissions: ['reserve_areas'] },
    });
    await reader.whenStable();
    expect(reader.componentInstance.canManage()).toBe(false);
  });

  it('muestra el error de la API cuando la carga falla', async () => {
    const fixture = setup(
      {
        is_superuser: true,
        active_tenant: { id: 1 },
        role: { slug: 'administrador', permissions: [] },
      },
      (apiMock) => apiMock.listAreas.mockReturnValue(throwError(() => new Error('sin red'))),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.errorMessage()).toContain('No se pudieron cargar');
  });

  it('renderiza la estructura principal de la página', async () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: ['manage_reservations'] },
    });
    await fixture.whenStable();
    fixture.componentInstance.monthCursor.set(new Date(2026, 10, 1)); // noviembre 2026
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Calendario de áreas comunes y reservas');
    expect(text).toContain('Áreas comunes');
    expect(text).toContain('Horarios');
    expect(text).toContain('Bloqueos');
    expect(text).toContain('Próximos bloqueos');
    expect(text).toContain('Reservas del mes');
    expect(text).toContain('Bloqueado · Piscina');

    // Encabezados de la grilla semanal (lunes primero).
    for (const weekday of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      expect(text).toContain(weekday);
    }
  });

  it('navega entre meses y vuelve a hoy', () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: [] },
    });
    const page = fixture.componentInstance;
    const initial = page.monthCursor();

    page.nextMonth();
    expect(page.monthCursor().getMonth()).toBe((initial.getMonth() + 1) % 12);

    page.previousMonth();
    page.previousMonth();
    expect(page.monthCursor().getMonth()).toBe((initial.getMonth() + 11) % 12);

    page.goToToday();
    const now = new Date();
    expect(page.monthCursor().getMonth()).toBe(now.getMonth());
    expect(page.monthCursor().getFullYear()).toBe(now.getFullYear());
  });

  it('construye semanas de 7 días que cubren el mes visible', () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: [] },
    });
    const page = fixture.componentInstance;
    page.monthCursor.set(new Date(2026, 10, 1)); // noviembre 2026

    const weeks = page.weeks();
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    for (const week of weeks) expect(week).toHaveLength(7);

    const allDays = weeks.flat();
    const novemberDays = allDays.filter((day) => day.inCurrentMonth).map((day) => day.dayOfMonth);
    expect(novemberDays).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('expande un bloqueo de varios días como eventos en cada día cubierto', () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: ['manage_reservations'] },
    });
    const page = fixture.componentInstance;
    page.monthCursor.set(new Date(2026, 10, 1));

    const events = page.calendarEvents().filter((event) => event.kind === 'block');
    expect(events.length).toBe(3); // 20, 21 y 22 de noviembre
    expect(events.map((event) => event.date)).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
  });

  it('muestra las reservas reales del backend como eventos', () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: ['manage_reservations'] },
    });
    const page = fixture.componentInstance;
    page.monthCursor.set(new Date(2026, 10, 1));

    const events = page.calendarEvents().filter((event) => event.kind === 'reservation');
    expect(events).toHaveLength(1);
    expect(events[0].areaName).toBe('Piscina');
    expect(events[0].status).toBe('CONFIRMED');
    expect(events[0].subtitle).toContain('Ana Mercado');
  });

  it('rechaza guardar un bloqueo con fin anterior al inicio', () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: ['manage_reservations'] },
    });
    const page = fixture.componentInstance;
    page.blockForm.common_area = '1';
    page.blockForm.reason = 'Mantenimiento';
    page.blockForm.blocked_from = '2026-12-02T10:00';
    page.blockForm.blocked_until = '2026-12-01T10:00';

    page.saveBlock();
    expect(api.createBlock).not.toHaveBeenCalled();
    expect(page.errorMessage()).toContain('fin debe ser posterior');
  });

  it('rechaza un horario con apertura posterior al cierre', () => {
    const fixture = setup({
      is_superuser: true,
      active_tenant: { id: 1 },
      role: { slug: 'administrador', permissions: ['manage_reservations'] },
    });
    const page = fixture.componentInstance;
    page.scheduleForm.common_area = '1';
    page.scheduleForm.weekday = '0';
    page.scheduleForm.opens_at = '18:00';
    page.scheduleForm.closes_at = '08:00';

    page.saveSchedule();
    expect(api.createSchedule).not.toHaveBeenCalled();
    expect(page.errorMessage()).toContain('apertura debe ser anterior');
  });
});
