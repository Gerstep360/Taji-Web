import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  QrScanFilters,
  QrScanGuard,
  QrScanHistoryResponse,
} from './qr-scan-history.models';

/** Cliente del historial de escaneos del guardia (RF-10 / CU10). */
@Injectable({ providedIn: 'root' })
export class QrScanHistoryApi {
  private readonly api = inject(ApiClient);

  /**
   * Devuelve una página del historial junto con los totales de la ventana.
   *
   * Los totales vienen en la misma respuesta a propósito: el tablero necesita
   * "cuántos escaneos van, cuántos pasaron y cuántos fallaron" y hacerlo con una
   * segunda llamada dejaría los números desincronizados de la tabla.
   */
  list(filters: QrScanFilters = {}): Observable<QrScanHistoryResponse> {
    let params = new HttpParams();

    if (filters.result) params = params.set('result', filters.result);
    if (filters.reason) params = params.set('reason', filters.reason);
    if (filters.guard_staff_id) params = params.set('guard_staff_id', String(filters.guard_staff_id));
    if (filters.days) params = params.set('days', String(filters.days));
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.page_size) params = params.set('page_size', String(filters.page_size));

    return this.api.get<QrScanHistoryResponse>(API_ENDPOINTS.security.qrScans.history, { params });
  }

  /** Guardias con actividad de escaneo, para poblar el filtro. */
  guards(): Observable<QrScanGuard[]> {
    return this.api.get<QrScanGuard[]>(API_ENDPOINTS.security.qrScans.guards);
  }
}
