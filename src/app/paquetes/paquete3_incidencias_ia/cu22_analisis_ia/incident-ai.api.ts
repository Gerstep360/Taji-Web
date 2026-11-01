import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';

export interface AIChoice {
  id: number;
  name: string;
  rank?: number;
  code?: string;
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
  risks: { name: string; evidence: string; context: string }[];
  safety_findings: { name: string; evidence: string; active: boolean; context: string }[];
  recommendations: string[];
  original_prediction?: unknown;
  entities: { entity_type: string; text_value: string; normalized_value: string }[];
  review: { reason: string; reviewer: string; reviewed_at: string } | null;
}
export interface AIState {
  analyses: AIAnalysis[];
  can_analyze: boolean;
  can_review: boolean;
}
export interface AICatalog {
  categories: AIChoice[];
  priorities: AIChoice[];
  can_manage: boolean;
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
    return this.api.post<object, AIAnalysis>(this.path(code) + id + '/review/', body);
  }
  catalogs() {
    return this.api.get<AICatalog>(API_ENDPOINTS.incidentAI + 'catalogs/');
  }
  writeCatalog(kind: string, id: number | null, body: object) {
    const path = API_ENDPOINTS.incidentAI + 'catalogs/' + kind + '/' + (id ? id + '/' : '');
    return id
      ? this.api.patch<object, AIChoice>(path, body)
      : this.api.post<object, AIChoice>(path, body);
  }
}
