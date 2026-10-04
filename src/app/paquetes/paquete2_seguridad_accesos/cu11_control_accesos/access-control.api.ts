import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { AccessEventItem, AccessEventListResponse, AccessEventPayload, AccessEventQuery } from './access-control.models';

@Injectable({ providedIn: 'root' })
export class AccessControlApi {
  private readonly api = inject(ApiClient);

  list(query: AccessEventQuery = {}): Observable<AccessEventListResponse> {
    let params = new HttpParams();
    if (query.event_type) params = params.set('event_type', query.event_type);
    if (query.search) params = params.set('search', query.search.trim());
    if (query.page) params = params.set('page', query.page.toString());
    if (query.page_size) params = params.set('page_size', query.page_size.toString());

    return this.api.get<AccessEventListResponse>(API_ENDPOINTS.security.root, { params });
  }

  create(payload: AccessEventPayload): Observable<AccessEventItem> {
    return this.api.post<AccessEventItem>(API_ENDPOINTS.security.root, payload);
  }
}
