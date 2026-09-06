import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Condominium } from '../../../domain/models/condominium.models';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class CondominiumService {
  private readonly api = inject(ApiClient);

  getCondominium(): Observable<Condominium> {
    return this.api.get<Condominium>(
      API_ENDPOINTS.condominium.current
    );
  }

  updateCondominium(
    data: Partial<Condominium>
  ): Observable<Condominium> {
    return this.api.patch<Partial<Condominium>, Condominium>(
      API_ENDPOINTS.condominium.current,
      data
    );
  }
}