import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { CondoMember, UserVehicle } from './user-vehicles.models';

@Injectable({
  providedIn: 'root',
})
export class UserVehiclesService {
  private readonly api = inject(ApiClient);
  private readonly basePath = '/security/vehicles/';

  listVehicles(search?: string): Observable<UserVehicle[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.api.get<UserVehicle[] | { results: UserVehicle[] }>(this.basePath, { params }).pipe(
      map((res) => (Array.isArray(res) ? res : res.results || []))
    );
  }

  getMembers(): Observable<CondoMember[]> {
    return this.api.get<CondoMember[]>(`${this.basePath}members/`);
  }

  createVehicle(payload: { plate: string; description: string; user: number | null }): Observable<UserVehicle> {
    return this.api.post<typeof payload, UserVehicle>(this.basePath, payload);
  }

  updateVehicle(id: number, payload: { plate: string; description: string; user: number | null }): Observable<UserVehicle> {
    return this.api.patch<typeof payload, UserVehicle>(`${this.basePath}${id}/`, payload);
  }

  deleteVehicle(id: number): Observable<void> {
    return this.api.delete<void>(`${this.basePath}${id}/`);
  }
}
