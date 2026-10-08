import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  InvitationResult,
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

  /**
   * Reenvía el acceso al correo del residente.
   *
   * Falla con 502 cuando el correo no pudo salir, en lugar de un 200 que
   * haría creer al operador que el residente ya lo recibió.
   */
  resendInvitation(id: number): Observable<InvitationResult> {
    return this.api.post<Record<string, never>, InvitationResult>(
      API_ENDPOINTS.residents.resendInvitation(id),
      {},
    );
  }
}
