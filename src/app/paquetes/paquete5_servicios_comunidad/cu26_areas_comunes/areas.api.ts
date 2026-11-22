import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  AreaBlock,
  AreaBlockPayload,
  AreaSchedule,
  AreaSchedulePayload,
  CommonArea,
  CommonAreaPayload,
  ListResponse,
  Reservation,
} from './areas.models';

/**
 * Cliente del CU26 (Gestionar Áreas Comunes).
 *
 * Consume los endpoints reales del backend: `/api/v1/community/areas/`,
 * `/api/v1/community/area-schedules/`, `/api/v1/community/area-blocks/` y
 * `/api/v1/community/reservations/` (esta última en modo solo lectura para el
 * calendario). Las listas vienen paginadas como `{ pagination, results }`
 * (paginación propia de Taji) o como `{count, results}`; `unwrap` normaliza
 * ambos casos y también tolera una lista plana.
 */
@Injectable({ providedIn: 'root' })
export class AreasApi {
  private readonly api = inject(ApiClient);

  // --- Áreas comunes --------------------------------------------------------

  listAreas(): Observable<CommonArea[]> {
    return this.list<CommonArea>(API_ENDPOINTS.community.areas);
  }

  createArea(payload: CommonAreaPayload): Observable<CommonArea> {
    return this.api.post<CommonAreaPayload, CommonArea>(API_ENDPOINTS.community.areas, payload);
  }

  updateArea(id: number, payload: Partial<CommonAreaPayload>): Observable<CommonArea> {
    return this.api.patch<Partial<CommonAreaPayload>, CommonArea>(
      API_ENDPOINTS.community.area(id),
      payload,
    );
  }

  setAreaStatus(id: number, status: CommonArea['status']): Observable<CommonArea> {
    return this.updateArea(id, { status });
  }

  // --- Horarios semanales (area-schedules) ----------------------------------

  listSchedules(commonAreaId?: number): Observable<AreaSchedule[]> {
    return this.list<AreaSchedule>(API_ENDPOINTS.community.areaSchedules, commonAreaId);
  }

  createSchedule(payload: AreaSchedulePayload): Observable<AreaSchedule> {
    return this.api.post<AreaSchedulePayload, AreaSchedule>(
      API_ENDPOINTS.community.areaSchedules,
      payload,
    );
  }

  updateSchedule(id: number, payload: Partial<AreaSchedulePayload>): Observable<AreaSchedule> {
    return this.api.patch<Partial<AreaSchedulePayload>, AreaSchedule>(
      API_ENDPOINTS.community.areaSchedule(id),
      payload,
    );
  }

  /**
   * El backend hace un borrado lógico: marca `is_active = false` y devuelve 204.
   */
  deleteSchedule(id: number): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.community.areaSchedule(id));
  }

  // --- Bloqueos temporales (area-blocks) ------------------------------------

  listBlocks(commonAreaId?: number): Observable<AreaBlock[]> {
    return this.list<AreaBlock>(API_ENDPOINTS.community.areaBlocks, commonAreaId);
  }

  createBlock(payload: AreaBlockPayload): Observable<AreaBlock> {
    return this.api.post<AreaBlockPayload, AreaBlock>(API_ENDPOINTS.community.areaBlocks, payload);
  }

  updateBlock(id: number, payload: Partial<AreaBlockPayload>): Observable<AreaBlock> {
    return this.api.patch<Partial<AreaBlockPayload>, AreaBlock>(
      API_ENDPOINTS.community.areaBlock(id),
      payload,
    );
  }

  deleteBlock(id: number): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.community.areaBlock(id));
  }

  // --- Reservas (CU27) — solo lectura para el calendario ----------------------

  listReservations(): Observable<Reservation[]> {
    return this.list<Reservation>(API_ENDPOINTS.community.reservations);
  }

  // --- Internos ---------------------------------------------------------------

  private list<T>(path: string, commonAreaId?: number): Observable<T[]> {
    let params = new HttpParams().set('page_size', '100');
    if (commonAreaId !== undefined) params = params.set('common_area', String(commonAreaId));
    return this.api.get<ListResponse<T>>(path, { params }).pipe(map(unwrap));
  }
}

function unwrap<T>(response: ListResponse<T>): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.results ?? [];
}
