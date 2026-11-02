import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';
import { ReportsApi } from './reports.api';
import { ReportRequest } from './reports.models';

describe('CU31 ReportsApi', () => {
  const client = { get: vi.fn(), post: vi.fn(), postBlob: vi.fn() };
  let api: ReportsApi;
  const query: ReportRequest = {
    source: 'incidents',
    title: 'Pendientes',
    columns: ['title'],
    filters: [{ field: 'status', operator: 'eq', value: 'REPORTED' }],
    ordering: [{ field: 'title', direction: 'desc' }],
    page: 2,
    page_size: 25,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockReturnValue(of({}));
    client.post.mockReturnValue(of({}));
    client.postBlob.mockReturnValue(of(new Blob(['Código\nINC-1'])));
    TestBed.configureTestingModule({
      providers: [ReportsApi, { provide: ApiClient, useValue: client }],
    });
    api = TestBed.inject(ReportsApi);
  });
  it('centraliza rutas y conserva la página ante errores recuperables', () => {
    api.catalog().subscribe();
    api.preview(query).subscribe();
    expect(client.get.mock.calls[0][0]).toBe('/cu31/catalog/');
    expect(client.post.mock.calls[0][0]).toBe('/cu31/preview/');
    expect(client.post.mock.calls[0][1]).toBe(query);
    expect(client.post.mock.calls[0][2].context.get(KEEP_PAGE_ON_SERVER_ERROR)).toBe(true);
  });
  it('envía texto sin grabación ni reproducción automática y narra a petición', () => {
    api.voice('Incidencias pendientes').subscribe();
    expect(client.post.mock.calls[0].slice(0, 2)).toEqual([
      '/cu31/voice-query/',
      { voice_text: 'Incidencias pendientes', auto_narrate: false },
    ]);
    api.narrate('incidents', 26).subscribe();
    expect(client.post.mock.calls[1].slice(0, 2)).toEqual([
      '/cu31/voice-narrate/',
      { source: 'incidents', total_count: 26 },
    ]);
  });
  it('exporta el mismo filtro y orden sin mutar la consulta', () => {
    api.export(query, 'csv').subscribe((blob) => expect(blob.size).toBeGreaterThan(0));
    expect(client.postBlob.mock.calls[0].slice(0, 2)).toEqual([
      '/cu31/export/',
      { ...query, format: 'csv' },
    ]);
    expect(query).not.toHaveProperty('format');
  });
});
