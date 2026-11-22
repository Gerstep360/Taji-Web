import { Injectable, inject } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { HttpParams, HttpContext } from '@angular/common/http';

export interface AIChoice {
  id: number;
  name: string;
  rank?: number;
  code?: string;
  description?: string;
  default_staff_type?: string | null;
  is_active?: boolean;
  target_minutes?: number | null;
  min_score?: number | string | null;
  max_score?: number | string | null;
}
export interface AIAnalysis {
  id: number;
  execution_status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  review_status: string;
  category: AIChoice | null;
  priority: AIChoice | null;
  confidence: number | null;
  risk_score: number | null;
  summary: string;
  model: string;
  model_version: string;
  duration_ms: number | null;
  error_code: string;
  risks: {
    name: string;
    evidence: string;
    context: string;
    source?: 'text' | 'image';
    attachment_id?: number | null;
  }[];
  media?: { attachment_id: number; status: 'sent' | 'skipped'; reason: string }[];
  safety_findings: { name: string; evidence: string; active: boolean; context: string }[];
  recommendations: string[];
  original_prediction?: unknown;
  entities: { entity_type: string; text_value: string; normalized_value: string }[];
  review: { reason: string; reviewer: string; reviewed_at: string } | null;
}
export interface AIState {
  processor?: { available: boolean; message: string; last_seen: string | null };
  analyses: AIAnalysis[];
  can_analyze: boolean;
  can_review: boolean;
}
export interface AICatalog {
  categories: AIChoice[];
  priorities: AIChoice[];
  can_manage: boolean;
  staff_types?: { code: string; name: string }[];
}
export interface AIMetrics {
  total: number;
  failed: number;
  reviewed: number;
  pending_review: number;
  processing: number;
  mean_duration_ms: number | null;
  period_days: number;
}

@Injectable({ providedIn: 'root' })
export class IncidentAIApi {
  private readonly api = inject(ApiClient);
  private path(code: string) {
    return API_ENDPOINTS.incidents + encodeURIComponent(code) + '/ai/';
  }
  state(code: string) {
    return this.api.get<AIState>(this.path(code));
  }
  analyze(code: string) {
    return this.api.post<object, AIAnalysis>(this.path(code), {});
  }
  review(code: string, id: number, body: object) {
    return this.api.post<object, AIAnalysis>(this.path(code) + id + '/review/', body, {
      context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true),
    });
  }
  catalogs(includeInactive = false) {
    return this.api.get<AICatalog>(
      API_ENDPOINTS.incidentAI + 'catalogs/',
      includeInactive ? { params: new HttpParams().set('include_inactive', 'true') } : undefined,
    );
  }
  metrics() {
    return this.api.get<AIMetrics>(API_ENDPOINTS.incidentAI + 'metrics/');
  }
  writeCatalog(kind: string, id: number | null, body: object) {
    const path = API_ENDPOINTS.incidentAI + 'catalogs/' + kind + '/' + (id ? id + '/' : '');
    const options = { context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true) };
    return id
      ? this.api.patch<object, AIChoice>(path, body, options)
      : this.api.post<object, AIChoice>(path, body, options);
  }
}
