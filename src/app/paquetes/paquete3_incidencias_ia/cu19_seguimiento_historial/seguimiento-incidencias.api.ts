import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { HANDLE_ERRORS_LOCALLY } from '../../../core/errors/api-error.interceptor';
import { IncidentDetailModel, IncidentFilterParams, IncidentListItem } from './seguimiento-incidencias.models';
import { IncidentReportOptions } from '../cu18_registrar_incidencia/registrar-incidencia.models';

@Injectable({ providedIn: 'root' })
export class SeguimientoIncidenciasApi {
  private readonly api = inject(ApiClient);

  list(params?: IncidentFilterParams): Observable<{ results: IncidentListItem[]; count?: number } | IncidentListItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search?.trim()) {
        httpParams = httpParams.set('search', params.search.trim());
      }
      if (params.status) {
        httpParams = httpParams.set('status', params.status);
      }
      if (params.category && Number(params.category) > 0) {
        httpParams = httpParams.set('category', String(params.category));
      }
      if (params.priority && Number(params.priority) > 0) {
        httpParams = httpParams.set('priority', String(params.priority));
      }
      if (params.sector && Number(params.sector) > 0) {
        httpParams = httpParams.set('sector', String(params.sector));
      }
      if (params.page && params.page > 0) {
        httpParams = httpParams.set('page', String(params.page));
      }
      if (params.page_size && params.page_size > 0) {
        httpParams = httpParams.set('page_size', String(params.page_size));
      }
    }

    return this.api.get<any>(API_ENDPOINTS.incidents.root, {
      params: httpParams,
      context: localErrors(),
    });
  }

  detail(id: number): Observable<IncidentDetailModel> {
    return this.api.get<IncidentDetailModel>(API_ENDPOINTS.incidents.detail(id), {
      context: localErrors(),
    });
  }

  options(): Observable<IncidentReportOptions> {
    return this.api.get<IncidentReportOptions>(API_ENDPOINTS.incidents.options, {
      context: localErrors(),
    });
  }

  addComment(id: number, body: string, visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC'): Observable<any> {
    return this.api.post<any, any>(API_ENDPOINTS.incidents.comments(id), { body, visibility }, {
      context: localErrors(),
    });
  }

  assignStaff(id: number, staff_id: number, reason: string): Observable<any> {
    return this.api.post<any, any>(API_ENDPOINTS.incidents.assign(id), { staff_id, reason }, {
      context: localErrors(),
    });
  }

  updateStatus(id: number, status: string, comment?: string): Observable<any> {
    return this.api.patch<any, any>(API_ENDPOINTS.incidents.detail(id), { status, comment }, {
      context: localErrors(),
    });
  }
}

function localErrors(): HttpContext {
  return new HttpContext().set(HANDLE_ERRORS_LOCALLY, true);
}
