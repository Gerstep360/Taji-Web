import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { ReportCatalog, ReportPreview, ReportRequest, ReportVoiceResult } from './reports.models';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly client = inject(ApiClient);
  private readonly root = API_ENDPOINTS.reports;
  private options() {
    return { context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true) };
  }
  catalog() {
    return this.client.get<ReportCatalog>(this.root + 'catalog/', this.options());
  }
  preview(request: ReportRequest) {
    return this.client.post<ReportRequest, ReportPreview>(
      this.root + 'preview/',
      request,
      this.options(),
    );
  }
  voice(text: string) {
    return this.client.post<object, ReportVoiceResult>(
      this.root + 'voice-query/',
      { voice_text: text, auto_narrate: false },
      this.options(),
    );
  }
  narrate(source: string, total: number) {
    return this.client.post<object, { spoken_summary: string }>(
      this.root + 'voice-narrate/',
      { source, total_count: total },
      this.options(),
    );
  }
  export(request: ReportRequest, format: string) {
    return this.client.postBlob(this.root + 'export/', { ...request, format }, this.options());
  }
}
