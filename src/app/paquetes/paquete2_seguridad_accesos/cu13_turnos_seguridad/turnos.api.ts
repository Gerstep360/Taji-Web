import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  CurrentShiftResponse,
  SecurityShift,
  SecurityShiftOptions,
  ShiftActionPayload,
  ShiftListResponse,
  ShiftPayload,
  ShiftQuery,
} from './turnos.models';

@Injectable({ providedIn: 'root' })
export class TurnosApi {
  private readonly api = inject(ApiClient);

  list(query: ShiftQuery = {}) {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.page_size) params = params.set('page_size', query.page_size);
    if (query.ordering) params = params.set('ordering', query.ordering);
    if (query.guard) params = params.set('guard', query.guard);
    if (query.status) params = params.set('status', query.status);
    if (query.date_from) params = params.set('date_from', query.date_from);
    if (query.date_to) params = params.set('date_to', query.date_to);
    if (query.search) params = params.set('search', query.search);

    return this.api.get<ShiftListResponse | SecurityShift[]>(API_ENDPOINTS.securityShifts.root, { params });
  }

  get(id: number) {
    return this.api.get<SecurityShift>(API_ENDPOINTS.securityShifts.detail(id));
  }

  create(payload: ShiftPayload) {
    return this.api.post<ShiftPayload, SecurityShift>(API_ENDPOINTS.securityShifts.root, payload);
  }

  update(id: number, payload: Partial<ShiftPayload>) {
    return this.api.patch<Partial<ShiftPayload>, SecurityShift>(
      API_ENDPOINTS.securityShifts.detail(id),
      payload
    );
  }

  iniciar(id: number, notes?: string) {
    return this.api.post<ShiftActionPayload, SecurityShift>(
      API_ENDPOINTS.securityShifts.iniciar(id),
      { notes: notes ?? '' }
    );
  }

  cerrar(id: number, notes?: string) {
    return this.api.post<ShiftActionPayload, SecurityShift>(
      API_ENDPOINTS.securityShifts.cerrar(id),
      { notes: notes ?? '' }
    );
  }

  cancelar(id: number, notes?: string) {
    return this.api.post<ShiftActionPayload, SecurityShift>(
      API_ENDPOINTS.securityShifts.cancelar(id),
      { notes: notes ?? '' }
    );
  }

  actual(guardId?: number) {
    let params = new HttpParams();
    if (guardId) params = params.set('guard', guardId);
    return this.api.get<CurrentShiftResponse | SecurityShift>(
      API_ENDPOINTS.securityShifts.actual,
      { params }
    );
  }

  proximos(guardId?: number) {
    let params = new HttpParams();
    if (guardId) params = params.set('guard', guardId);
    return this.api.get<SecurityShift[]>(API_ENDPOINTS.securityShifts.proximos, { params });
  }

  historial(query: ShiftQuery = {}) {
    let params = new HttpParams();
    if (query.guard) params = params.set('guard', query.guard);
    if (query.status) params = params.set('status', query.status);
    if (query.date_from) params = params.set('date_from', query.date_from);
    if (query.date_to) params = params.set('date_to', query.date_to);

    return this.api.get<SecurityShift[]>(API_ENDPOINTS.securityShifts.historial, { params });
  }

  options() {
    return this.api.get<SecurityShiftOptions>(API_ENDPOINTS.securityShifts.options);
  }
}
