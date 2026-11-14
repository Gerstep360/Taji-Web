import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../../../core/api/app-config.service';
import { AreasApi } from './areas.api';

describe('AreasApi (CU26)', () => {
  let api: AreasApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AppConfigService,
          useValue: {
            endpoint: (path: string) => `http://localhost:8000/api/v1${path}`,
            config: () => ({ requestTimeoutMs: 12000 }),
          },
        },
      ],
    });
    api = TestBed.inject(AreasApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista áreas y normaliza la respuesta paginada Taji ({pagination, results})', () => {
    let result: unknown;
    api.listAreas().subscribe((value) => (result = value));
    const request = http.expectOne('http://localhost:8000/api/v1/community/areas/?page_size=100');
    expect(request.request.method).toBe('GET');
    request.flush({
      pagination: { page: 1, page_size: 100, total_items: 1, total_pages: 1 },
      results: [{ id: 7, name: 'Piscina', description: '', sector: null, capacity: 30, requires_approval: false, status: 'AVAILABLE' }],
    });
    expect(result).toEqual([{ id: 7, name: 'Piscina', description: '', sector: null, capacity: 30, requires_approval: false, status: 'AVAILABLE' }]);
  });

  it('acepta una lista plana cuando el backend no pagina', () => {
    let result: unknown;
    api.listAreas().subscribe((value) => (result = value));
    const request = http.expectOne('http://localhost:8000/api/v1/community/areas/?page_size=100');
    request.flush([{ id: 3, name: 'SUM', description: '', sector: null, capacity: 50, requires_approval: true, status: 'MAINTENANCE' }]);
    expect(result).toEqual([{ id: 3, name: 'SUM', description: '', sector: null, capacity: 50, requires_approval: true, status: 'MAINTENANCE' }]);
  });

  it('crea un área con el contrato del backend (status AVAILABLE)', () => {
    const payload = { name: 'Cancha', capacity: 22, status: 'AVAILABLE' as const, description: 'Sintética', requires_approval: false, sector: null };
    api.createArea(payload).subscribe();
    const request = http.expectOne('http://localhost:8000/api/v1/community/areas/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 1, ...payload, sector_name: '' });
  });

  it('actualiza el estado de un área con PATCH', () => {
    api.setAreaStatus(9, 'INACTIVE').subscribe();
    const request = http.expectOne('http://localhost:8000/api/v1/community/areas/9/');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'INACTIVE' });
    request.flush({ id: 9, status: 'INACTIVE' });
  });

  it('filtra los horarios por common_area cuando se indica', () => {
    api.listSchedules(4).subscribe();
    const request = http.expectOne('http://localhost:8000/api/v1/community/area-schedules/?page_size=100&common_area=4');
    expect(request.request.method).toBe('GET');
    request.flush({ pagination: {}, results: [] });
  });

  it('crea, actualiza y desactiva horarios en /community/area-schedules/', () => {
    const payload = { common_area: 2, weekday: 5, opens_at: '08:00', closes_at: '12:00', is_active: true };

    api.createSchedule(payload).subscribe();
    const created = http.expectOne('http://localhost:8000/api/v1/community/area-schedules/');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual(payload);
    created.flush({ id: 11, ...payload });

    api.updateSchedule(11, { is_active: false }).subscribe();
    const updated = http.expectOne('http://localhost:8000/api/v1/community/area-schedules/11/');
    expect(updated.request.method).toBe('PATCH');
    expect(updated.request.body).toEqual({ is_active: false });
    updated.flush({ id: 11, ...payload, is_active: false });

    api.deleteSchedule(11).subscribe();
    const deleted = http.expectOne('http://localhost:8000/api/v1/community/area-schedules/11/');
    expect(deleted.request.method).toBe('DELETE');
    deleted.flush(null);
  });

  it('crea y elimina bloqueos en /community/area-blocks/', () => {
    const payload = {
      common_area: 2,
      blocked_from: '2026-12-01T08:00:00.000Z',
      blocked_until: '2026-12-02T18:00:00.000Z',
      reason: 'Mantenimiento de piscina',
    };

    api.createBlock(payload).subscribe();
    const created = http.expectOne('http://localhost:8000/api/v1/community/area-blocks/');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual(payload);
    created.flush({ id: 5, ...payload });

    api.deleteBlock(5).subscribe();
    const deleted = http.expectOne('http://localhost:8000/api/v1/community/area-blocks/5/');
    expect(deleted.request.method).toBe('DELETE');
    deleted.flush(null);
  });

  it('lista las reservas reales del condominio en /community/reservations/', () => {
    let result: unknown;
    api.listReservations().subscribe((value) => (result = value));
    const request = http.expectOne('http://localhost:8000/api/v1/community/reservations/?page_size=100');
    expect(request.request.method).toBe('GET');
    request.flush({
      pagination: { page: 1, page_size: 100, total_items: 1, total_pages: 1 },
      results: [{
        id: 42,
        common_area: 7,
        common_area_name: 'Piscina',
        resident: 9,
        resident_name: 'Ana Mercado',
        start_at: '2026-11-20T14:00:00.000Z',
        end_at: '2026-11-20T16:00:00.000Z',
        status: 'APPROVED',
        purpose: 'Cumpleaños',
        created_at: '2026-11-01T00:00:00.000Z',
      }],
    });
    expect(result).toEqual([expect.objectContaining({ id: 42, status: 'APPROVED' })]);
  });
});
