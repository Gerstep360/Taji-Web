import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfigService } from '../../../core/api/app-config.service';
import { ReportsApi } from './reportes.api';
import { ReportRequest } from './reportes.models';

describe('ReportsApi', () => {
  let api: ReportsApi;
  let http: HttpTestingController;
  const body: ReportRequest = { source: 'staff', title: 'Personal', columns: ['name'], filters: [], ordering: [], page: 1, page_size: 25 };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AppConfigService, useValue: { endpoint: (path: string) => `http://localhost:8000/api/v1${path}`, config: () => ({ requestTimeoutMs: 12000 }) } },
    ] });
    api = TestBed.inject(ReportsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta el catálogo y envía columnas, filtros y orden a la vista previa', () => {
    api.catalog().subscribe();
    http.expectOne('http://localhost:8000/api/v1/reports/catalog/').flush({});
    api.preview(body).subscribe();
    const request = http.expectOne('http://localhost:8000/api/v1/reports/preview/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });
  it('solicita ambos archivos como blobs sin modificar la configuración', () => {
    for (const format of ['xlsx', 'html'] as const) {
      api.export(body, format).subscribe();
      const request = http.expectOne('http://localhost:8000/api/v1/reports/export/');
      expect(request.request.body).toEqual({ ...body, format });
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['reporte']));
    }
    expect(body).not.toHaveProperty('format');
  });
});
