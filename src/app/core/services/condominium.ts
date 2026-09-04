import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Condominium } from '../../domain/models/condominium.models';

@Injectable({
  providedIn: 'root'
})
export class CondominiumService {
  private http = inject(HttpClient);
  private apiUrl = 'condominiums/current/';

  getCondominium(): Observable<Condominium> {
    return this.http.get<Condominium>(this.apiUrl);
  }

  updateCondominium(data: Partial<Condominium>): Observable<Condominium> {
    return this.http.patch<Condominium>(this.apiUrl, data);
  }
}