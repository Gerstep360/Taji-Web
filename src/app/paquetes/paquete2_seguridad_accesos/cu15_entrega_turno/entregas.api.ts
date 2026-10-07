import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { SecurityShift } from '../cu13_turnos_seguridad/turnos.models';
import { ShiftLog } from '../cu14_novedades_incidentes/novedades.models';

export interface Handover {
  id: number;
  outgoing_shift: number;
  incoming_shift: number | null;
  outgoing_detail: SecurityShift;
  incoming_detail: SecurityShift | null;
  summary: string;
  delivered_by_user: number | null;
  received_by_user: number | null;
  delivered_at: string;
  received_at: string | null;
  status: 'PENDING' | 'RECEIVED' | 'REJECTED';
  log_entries: ShiftLog[];
}
export interface HandoverPage {
  results: Handover[];
  pagination: { page: number; total_pages: number; total_items: number };
}
@Injectable({ providedIn: 'root' })
export class EntregasApi {
  private readonly api = inject(ApiClient);
  list(query: Record<string, string | number> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== '') params = params.set(key, value);
    return this.api.get<HandoverPage>(API_ENDPOINTS.handovers.root, { params });
  }
  detail(id: number) { return this.api.get<Handover>(API_ENDPOINTS.handovers.detail(id)); }
}
