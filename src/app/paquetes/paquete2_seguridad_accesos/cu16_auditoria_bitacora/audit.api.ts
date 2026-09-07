import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { AuditListResponse, AuditQuery } from './audit.models';

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly api = inject(ApiClient);

  list(query: AuditQuery = {}): Observable<AuditListResponse> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.page_size) params = params.set('page_size', query.page_size);
    if (query.search) params = params.set('search', query.search.trim());
    if (query.category) params = params.set('category', query.category.trim());
    if (query.action_code) params = params.set('action_code', query.action_code.trim());

    return this.api.get<AuditListResponse>(API_ENDPOINTS.audit.root, { params });
  }
}
