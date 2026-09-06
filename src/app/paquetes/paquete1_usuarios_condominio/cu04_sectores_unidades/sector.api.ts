import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { Sector, SectorListResponse, SectorOptions, SectorPayload, SectorQuery } from './sector.models';

@Injectable({ providedIn: 'root' })
export class SectorApi {
  private readonly api = inject(ApiClient);

  list(query: SectorQuery) {
    let params = new HttpParams()
      .set('page', query.page)
      .set('page_size', query.page_size)
      .set('ordering', query.ordering ?? 'code');
    for (const [key, value] of Object.entries({
      search: query.search,
      sector_type: query.sector_type,
    })) {
      if (value) params = params.set(key, value);
    }
    return this.api.get<SectorListResponse>(API_ENDPOINTS.sectors.root, { params });
  }

  options() {
    return this.api.get<SectorOptions>(API_ENDPOINTS.sectors.options);
  }

  create(payload: SectorPayload) {
    return this.api.post<SectorPayload, Sector>(API_ENDPOINTS.sectors.root, payload);
  }

  update(id: number, payload: SectorPayload) {
    return this.api.patch<SectorPayload, Sector>(API_ENDPOINTS.sectors.detail(id), payload);
  }

  delete(id: number) {
    return this.api.delete<void>(API_ENDPOINTS.sectors.detail(id));
  }
}