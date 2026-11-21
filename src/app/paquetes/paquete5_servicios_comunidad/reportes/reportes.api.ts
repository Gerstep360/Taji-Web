import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { timeout } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { AppConfigService } from '../../../core/api/app-config.service';
import { ReportCatalog, ReportPreview, ReportRequest } from './reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  catalog() { return this.api.get<ReportCatalog>(API_ENDPOINTS.customReports.catalog); }
  preview(body: ReportRequest) {
    return this.api.post<ReportRequest, ReportPreview>(API_ENDPOINTS.customReports.preview, body);
  }
  export(body: ReportRequest, format: 'xlsx' | 'html') {
    // HttpClient conserva los interceptores de sesión y tenant también para descargas.
    return this.http.post(this.config.endpoint(API_ENDPOINTS.customReports.export), { ...body, format }, {
      responseType: 'blob',
    }).pipe(timeout(60000));
  }
}
