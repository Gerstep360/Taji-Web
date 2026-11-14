import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';

export type VisionMode = 'image' | 'video';
export type Review = 'pending' | 'confirmed' | 'corrected' | 'dismissed' | 'proposed';
export type Sector = { id: number; name: string };
export type VisionConfig = {
  modes: VisionMode[]; worker_ready: boolean; can_review: boolean; interval: number; retention_days: number;
  periodic: number; idle: number; session_per_hour: number; session_burst: number;
  sectors: Sector[]; image_max_bytes: number; video_max_bytes: number;
};
export type Observation = {
  id: string; sector: Sector | null; mode: VisionMode; observed_from: string; observed_until: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';
  provider_status: string; provider_ms: number | null; model_id: string;
  description?: string; has_evidence?: boolean; review_status?: Review; review_text?: string;
  prediction?: { interpretation: string; new_or_changed: string; uncertainty: string; relevance_reason: string;
    visible_entities: string[]; suggested_action: 'ignore' | 'record' | 'human_review'; prior_review?: Review };
  context_matches?: { code: string; reason: string; open: boolean }[];
};

@Injectable({ providedIn: 'root' })
export class VisualApi {
  private readonly api = inject(ApiClient);
  private readonly root = 'paquete3/cu32/vision';
  private options(params?: HttpParams) {
    return { context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true), params };
  }

  settings() { return this.api.get<VisionConfig>(`${this.root}/settings/`, this.options()); }
  start(sector: number | null, keepEvidence: boolean) {
    return this.api.post<unknown, { id: string; expires_at: string }>(`${this.root}/sessions/`,
      { sector, keep_evidence: keepEvidence }, this.options());
  }
  stop(id: string) { return this.api.post(`${this.root}/sessions/${id}/stop/`, {}, { ...this.options(), keepalive: true }); }
  upload(id: string, mode: VisionMode, media: Blob, age: number) {
    const data = new FormData();
    data.append('window', crypto.randomUUID());
    data.append('mode', mode);
    data.append('age_ms', String(age));
    data.append('media', media, mode === 'video' ? 'ventana.mp4' : 'captura.jpg');
    return this.api.post<FormData, Observation>(`${this.root}/sessions/${id}/windows/`, data, this.options());
  }
  history(filters: Record<string, string>) {
    return this.api.get<{ count: number; next: string | null; results: Observation[] }>(`${this.root}/observations/`,
      this.options(new HttpParams({ fromObject: filters })));
  }
  detail(id: string) { return this.api.get<Observation>(`${this.root}/observations/${id}/`, this.options()); }
  review(id: string, decision: Exclude<Review, 'pending'>, note: string) {
    return this.api.post<unknown, Observation>(`${this.root}/observations/${id}/review/`, { decision, note }, this.options());
  }
  evidence(id: string) { return this.api.getBlob(`${this.root}/observations/${id}/evidence/`, this.options()); }
}
