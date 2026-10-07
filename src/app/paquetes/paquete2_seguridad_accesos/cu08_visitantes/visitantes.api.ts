import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  ResidentDirectoryItem,
  UnitDirectoryItem,
  VisitAuthorization,
  VisitCreatePayload,
  VisitListResponse,
  VisitOptions,
  VisitQuery,
  VisitUpdatePayload,
} from './visitantes.models';

interface PagedResult<T> {
  results: T[];
  pagination?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class VisitantesApi {
  private readonly api = inject(ApiClient);

  list(query: VisitQuery = {}): Observable<VisitListResponse> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.page_size) params = params.set('page_size', query.page_size);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status?.trim()) params = params.set('status', query.status.trim());
    if (query.resident) params = params.set('resident', query.resident);
    if (query.unit) params = params.set('unit', query.unit);
    if (query.date_from?.trim()) params = params.set('date_from', query.date_from.trim());
    if (query.date_to?.trim()) params = params.set('date_to', query.date_to.trim());
    if (query.ordering?.trim()) params = params.set('ordering', query.ordering.trim());

    return this.api.get<VisitListResponse>(API_ENDPOINTS.visitAuthorizations.root, { params });
  }

  options(): Observable<VisitOptions> {
    return this.api.get<VisitOptions>(API_ENDPOINTS.visitAuthorizations.options);
  }

  get(id: number): Observable<VisitAuthorization> {
    return this.api.get<VisitAuthorization>(API_ENDPOINTS.visitAuthorizations.detail(id));
  }

  create(payload: VisitCreatePayload): Observable<VisitAuthorization> {
    return this.api.post<VisitCreatePayload, VisitAuthorization>(
      API_ENDPOINTS.visitAuthorizations.root,
      payload,
    );
  }

  update(id: number, payload: VisitUpdatePayload): Observable<VisitAuthorization> {
    return this.api.patch<VisitUpdatePayload, VisitAuthorization>(
      API_ENDPOINTS.visitAuthorizations.detail(id),
      payload,
    );
  }

  cancel(id: number): Observable<VisitAuthorization> {
    return this.api.post<Record<string, never>, VisitAuthorization>(
      API_ENDPOINTS.visitAuthorizations.cancel(id),
      {},
    );
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.visitAuthorizations.detail(id));
  }

  units(search = ''): Observable<PagedResult<UnitDirectoryItem> | UnitDirectoryItem[]> {
    let params = new HttpParams().set('page', '1').set('page_size', '100');
    if (search.trim()) params = params.set('search', search.trim());
    return this.api.get<PagedResult<UnitDirectoryItem> | UnitDirectoryItem[]>('/units/', { params });
  }

  residents(search = ''): Observable<PagedResult<ResidentDirectoryItem>> {
    let params = new HttpParams().set('page', '1').set('page_size', '100');
    if (search.trim()) params = params.set('search', search.trim());
    return this.api.get<PagedResult<ResidentDirectoryItem>>(API_ENDPOINTS.residentDirectory.root, {
      params,
    });
  }
}
