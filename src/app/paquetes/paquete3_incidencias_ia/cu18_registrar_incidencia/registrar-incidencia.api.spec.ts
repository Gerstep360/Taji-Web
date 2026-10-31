import { HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client.service';
import { HANDLE_ERRORS_LOCALLY } from '../../../core/errors/api-error.interceptor';
import { RegistrarIncidenciaApi } from './registrar-incidencia.api';

describe('CU18 RegistrarIncidenciaApi', () => {
  const client = { get: vi.fn(), post: vi.fn() };
  let api: RegistrarIncidenciaApi;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [RegistrarIncidenciaApi, { provide: ApiClient, useValue: client }],
    });
    api = TestBed.inject(RegistrarIncidenciaApi);
  });

  it('loads the report options from the centralized endpoint and handles errors locally', () => {
    client.get.mockReturnValue(of({}));
    api.options().subscribe();

    const [path, options] = client.get.mock.calls[0] as [string, { context: HttpContext }];
    expect(path).toBe('/incidents/options/');
    expect(options.context.get(HANDLE_ERRORS_LOCALLY)).toBe(true);
  });

  it('builds multipart data with only the allowed fields', () => {
    client.post.mockReturnValue(of({ id: 1 }));
    const photo = new File(['img'], 'fuga.png', { type: 'image/png' });
    const doc = new File(['pdf'], 'acta.pdf', { type: 'application/pdf' });

    api
      .create({
        title: '  Fuga de agua ',
        description: '  Gotea el techo del pasillo  ',
        category: 3,
        sector: 10,
        unit: 7,
        asset: null,
        evidences: [photo, doc],
      })
      .subscribe();

    const [path, body, options] = client.post.mock.calls[0] as [string, FormData, { context: HttpContext }];
    expect(path).toBe('/incidents/');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('title')).toBe('Fuga de agua');
    expect(body.get('description')).toBe('Gotea el techo del pasillo');
    expect(body.get('category')).toBe('3');
    expect(body.get('sector')).toBe('10');
    expect(body.get('unit')).toBe('7');
    expect(body.has('asset')).toBe(false);
    expect(body.getAll('evidences').map((f) => (f as File).name)).toEqual(['fuga.png', 'acta.pdf']);
    for (const forbidden of ['priority', 'reporter', 'condominium', 'status']) {
      expect(body.has(forbidden)).toBe(false);
    }
    expect(options.context.get(HANDLE_ERRORS_LOCALLY)).toBe(true);
  });

  it('omits an empty title', () => {
    client.post.mockReturnValue(of({ id: 1 }));
    api
      .create({ title: '   ', description: 'Algo', category: 1, sector: 2, unit: null, asset: null, evidences: [] })
      .subscribe();
    const body = client.post.mock.calls[0][1] as FormData;
    expect(body.has('title')).toBe(false);
    expect(body.has('unit')).toBe(false);
    expect(body.has('evidences')).toBe(false);
  });
});
