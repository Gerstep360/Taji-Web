import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';

export type VisitSection = 'expected' | 'inside' | 'history';
export interface VisitRow {
  id: number;
  visitor_name: string;
  visitor_document_number: string;
  unit_code: string;
  resident_name?: string;
  valid_from?: string;
  valid_until?: string;
  status_display?: string;
  occurred_at?: string;
  entered_at?: string;
  event_type_display?: string;
  validation_result_display?: string;
  validation_method_display?: string;
  notes?: string;
  purpose?: string;
}
export interface VisitResponse {
  results: VisitRow[];
  pagination: { page: number; total_pages: number; total_items: number; next: string | null; previous: string | null };
}
@Injectable({ providedIn: 'root' })
export class VisitConsultationApi {
  private readonly api = inject(ApiClient);
  list(section: VisitSection, page: number, search: string) {
    const params = new HttpParams().set('section', section).set('page', page).set('search', search);
    return this.api.get<VisitResponse>(API_ENDPOINTS.visitConsultation, { params });
  }
}
