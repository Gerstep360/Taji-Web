import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { Unit, UnitListResponse, UnitOptions, UnitPayload, UnitQuery } from './unit.models';

@Injectable({ providedIn: 'root' })
export class UnitApi {
  private readonly api = inject(ApiClient);

  list(query: UnitQuery) {
    let params = new HttpParams()
      .set('page', query.page)
      .set('page_size', query.page_size)
      .set('ordering', query.ordering ?? 'code');
    for (const [key, value] of Object.entries({
      search: query.search,
      sector: query.sector,
      unit_type: query.unit_type,
      status: query.status,
    })) {
      if (value) params = params.set(key, value as string);
    }
    return this.api.get<UnitListResponse>(API_ENDPOINTS.units.root, { params });
  }

  options() {
    return this.api.get<UnitOptions>(API_ENDPOINTS.units.options);
  }

  create(payload: UnitPayload) {
    return this.api.post<UnitPayload, Unit>(API_ENDPOINTS.units.root, payload);
  }

  update(id: number, payload: UnitPayload) {
    return this.api.patch<UnitPayload, Unit>(API_ENDPOINTS.units.detail(id), payload);
  }

  delete(id: number) {
    return this.api.delete<void>(API_ENDPOINTS.units.detail(id));
  }
}