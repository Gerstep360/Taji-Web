import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  StaffListResponse,
  StaffMember,
  StaffOptions,
  StaffPayload,
  StaffQuery,
} from './staff.models';

@Injectable({ providedIn: 'root' })
export class StaffApi {
  private readonly api = inject(ApiClient);

  list(query: StaffQuery) {
    let params = new HttpParams()
      .set('page', query.page)
      .set('page_size', query.page_size)
      .set('ordering', query.ordering ?? 'person__last_name');
    for (const [key, value] of Object.entries({
      search: query.search,
      staff_type: query.staff_type,
      status: query.status,
    })) {
      if (value) params = params.set(key, value);
    }
    return this.api.get<StaffListResponse>(API_ENDPOINTS.staff.root, { params });
  }

  options() {
    return this.api.get<StaffOptions>(API_ENDPOINTS.staff.options);
  }

  create(payload: StaffPayload) {
    return this.api.post<StaffPayload, StaffMember>(API_ENDPOINTS.staff.root, payload);
  }

  update(id: number, payload: StaffPayload) {
    return this.api.patch<StaffPayload, StaffMember>(API_ENDPOINTS.staff.detail(id), payload);
  }

  delete(id: number) {
    return this.api.delete<void>(API_ENDPOINTS.staff.detail(id));
  }
}
