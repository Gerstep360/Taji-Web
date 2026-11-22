import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import {
  AreaAvailability,
  CalendarResponse,
  CreateReservationPayload,
  Page,
  Reservation,
  ReservationFilters,
  ReservationSummary,
  ReservableArea,
  ResidentOption,
} from './reservas.models';

/** Rutas del CU27 (Backend: paquetes/paquete5_servicios_comunidad/cu27_reservas_areas). */
export const CU27_ENDPOINTS = {
  areas: '/paquete5/cu27/areas/',
  availability: (areaId: number) => `/paquete5/cu27/areas/${areaId}/availability/`,
  reservations: '/paquete5/cu27/reservations/',
  reservation: (id: number) => `/paquete5/cu27/reservations/${id}/`,
  action: (id: number, action: ReservationAction) => `/paquete5/cu27/reservations/${id}/${action}/`,
  calendar: '/paquete5/cu27/reservations/calendar/',
  summary: '/paquete5/cu27/reservations/summary/',
  residents: '/paquete5/cu27/residents/',
};

export type ReservationAction = 'approve' | 'reject' | 'cancel' | 'complete';

function toParams(values: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ReservasApi {
  private readonly api = inject(ApiClient);

  listAreas() {
    return this.api.get<Page<ReservableArea>>(CU27_ENDPOINTS.areas, { params: toParams({ page_size: 100 }) });
  }

  availability(areaId: number, date: string) {
    return this.api.get<AreaAvailability>(CU27_ENDPOINTS.availability(areaId), { params: toParams({ date }) });
  }

  listReservations(filters: ReservationFilters = {}) {
    return this.api.get<Page<Reservation>>(CU27_ENDPOINTS.reservations, { params: toParams(filters) });
  }

  calendar(dateFrom: string, dateTo: string, commonArea?: number | null) {
    return this.api.get<CalendarResponse>(CU27_ENDPOINTS.calendar, {
      params: toParams({ date_from: dateFrom, date_to: dateTo, common_area: commonArea ?? '' }),
    });
  }

  summary() {
    return this.api.get<ReservationSummary>(CU27_ENDPOINTS.summary);
  }

  residents(search: string) {
    return this.api.get<ResidentOption[]>(CU27_ENDPOINTS.residents, { params: toParams({ search }) });
  }

  create(payload: CreateReservationPayload) {
    return this.api.post<CreateReservationPayload, Reservation>(CU27_ENDPOINTS.reservations, payload);
  }

  runAction(id: number, action: ReservationAction, reason = '') {
    return this.api.post<{ reason: string }, Reservation>(CU27_ENDPOINTS.action(id, action), { reason });
  }
}
