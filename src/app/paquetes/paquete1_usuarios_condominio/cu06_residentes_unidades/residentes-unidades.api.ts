import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  PagedResponse,
  ResidentOption,
  ResidentUnitLink,
  ResidentUnitPayload,
  UnitOption,
} from './residentes-unidades.models';

@Injectable({ providedIn: 'root' })
export class ResidentesUnidadesApi {
  private readonly api = inject(ApiClient);

  residents(search = '') {
    const params = new HttpParams().set('page', '1').set('page_size', '100').set('search', search);
    return this.api.get<PagedResponse<ResidentOption>>(API_ENDPOINTS.residents.root, { params });
  }

  units(search = '') {
    const params = new HttpParams().set('page', '1').set('page_size', '100').set('search', search);
    return this.api.get<PagedResponse<UnitOption>>('/units/', { params });
  }

  links(active: 'all' | 'true' | 'false' = 'all') {
    const params = new HttpParams().set('page', '1').set('page_size', '100');
    return this.api.get<PagedResponse<ResidentUnitLink>>(API_ENDPOINTS.residentUnits.root, {
      params: active === 'all' ? params : params.set('active', active),
    });
  }

  create(payload: ResidentUnitPayload) {
    return this.api.post<ResidentUnitPayload, ResidentUnitLink>(API_ENDPOINTS.residentUnits.root, payload);
  }

  update(id: number, payload: Partial<ResidentUnitPayload>) {
    return this.api.patch<Partial<ResidentUnitPayload>, ResidentUnitLink>(
      API_ENDPOINTS.residentUnits.detail(id),
      payload,
    );
  }
}
