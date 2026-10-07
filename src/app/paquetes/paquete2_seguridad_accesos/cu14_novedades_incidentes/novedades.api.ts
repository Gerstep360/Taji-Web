import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { ShiftLogPage } from './novedades.models';

@Injectable({ providedIn: 'root' })
export class NovedadesApi {
  private readonly api = inject(ApiClient);
  list(query: Record<string, string | number> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== '') params = params.set(key, value);
    }
    return this.api.get<ShiftLogPage>(API_ENDPOINTS.shiftLogs.root, { params });
  }
}
