import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client.service';
import { VisitantesApi } from './visitantes.api';
import {
  VisitAuthorization,
  VisitCreatePayload,
  VisitListResponse,
  VisitUpdatePayload,
} from './visitantes.models';

describe('VisitantesApi', () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  let api: VisitantesApi;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [VisitantesApi, { provide: ApiClient, useValue: client }],
    });
    api = TestBed.inject(VisitantesApi);
  });

  it('sends query parameters, status and date filters to the visit-authorizations list endpoint', () => {
    const mockResponse: VisitListResponse = {
      pagination: {
        page: 1,
        page_size: 20,
        total_items: 1,
        total_pages: 1,
        next: null,
        previous: null,
      },
      results: [],
    };
    client.get.mockReturnValue(of(mockResponse));

    api
      .list({
        page: 1,
        page_size: 20,
        search: 'Carlos',
        status: 'AUTHORIZED',
        date_from: '2026-09-24',
      })
      .subscribe();

    expect(client.get).toHaveBeenCalledOnce();
    const [path, options] = client.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(path).toBe('/visit-authorizations/');
    expect(options.params.get('page')).toBe('1');
    expect(options.params.get('search')).toBe('Carlos');
    expect(options.params.get('status')).toBe('AUTHORIZED');
    expect(options.params.get('date_from')).toBe('2026-09-24');
  });

  it('handles create, update and cancel operations correctly', () => {
    const createPayload: VisitCreatePayload = {
      visitor_first_name: 'Carlos',
      visitor_last_name: 'Medina',
      visitor_document_type: 'CI',
      visitor_document_number: '1234567',
      unit_id: 5,
      purpose: 'Reunión familiar',
      valid_from: '2026-09-24T18:00:00Z',
      valid_until: '2026-09-24T22:00:00Z',
    };
    const updatePayload: VisitUpdatePayload = {
      purpose: 'Entrega urgente',
    };

    client.post.mockReturnValue(of({ id: 10 } as VisitAuthorization));
    client.patch.mockReturnValue(of({ id: 10 } as VisitAuthorization));

    api.create(createPayload).subscribe();
    expect(client.post).toHaveBeenCalledWith('/visit-authorizations/', createPayload);

    api.update(10, updatePayload).subscribe();
    expect(client.patch).toHaveBeenCalledWith('/visit-authorizations/10/', updatePayload);

    api.cancel(10).subscribe();
    expect(client.post).toHaveBeenCalledWith('/visit-authorizations/10/cancel/', {});
  });

  it('retrieves options and catalog options', () => {
    client.get.mockReturnValue(of({ statuses: [], document_types: [] }));

    api.options().subscribe();
    expect(client.get).toHaveBeenCalledWith('/visit-authorizations/options/');
  });
});
