import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import {
  ResidentListResponse,
  ResidentOptions,
  ResidentPayload,
  ResidentPerson,
  ResidentQuery,
} from './resident.models';

@Injectable({ providedIn: 'root' })
export class ResidentApi {
  private readonly api = inject(ApiClient);

  list(query: ResidentQuery) {
    let params = new HttpParams()
      .set('page', query.page)
      .set('page_size', query.page_size)
      .set('ordering', query.ordering ?? 'person__last_name');
    for (const [key, value] of Object.entries({
      search: query.search,
      status: query.status,
    })) {
      if (value) params = params.set(key, value);
    }
    return this.api.get<ResidentListResponse>(API_ENDPOINTS.residents.root, { params });
  }

  options() {
    return this.api.get<ResidentOptions>(API_ENDPOINTS.residents.options);
  }

  create(payload: ResidentPayload) {
    return this.api.post<ResidentPayload, ResidentPerson>(API_ENDPOINTS.residents.root, payload);
  }

  update(id: number, payload: Partial<ResidentPayload>) {
    return this.api.patch<Partial<ResidentPayload>, ResidentPerson>(
      API_ENDPOINTS.residents.detail(id),
      payload,
    );
  }
}
