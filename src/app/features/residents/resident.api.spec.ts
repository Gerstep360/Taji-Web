import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client.service';
import { ResidentApi } from './resident.api';
import { ResidentListResponse, ResidentPayload } from './resident.models';

describe('ResidentApi', () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  let api: ResidentApi;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [ResidentApi, { provide: ApiClient, useValue: client }],
    });
    api = TestBed.inject(ResidentApi);
  });

  it('sends pagination and status filters to the CU05 list contract', () => {
    const response: ResidentListResponse = {
      pagination: {
        page: 2,
        page_size: 10,
        total_items: 0,
        total_pages: 0,
        next: null,
        previous: null,
      },
      results: [],
    };
    client.get.mockReturnValue(of(response));

    api.list({ page: 2, page_size: 10, search: 'Ana', status: 'ACTIVE' }).subscribe();

    expect(client.get).toHaveBeenCalledOnce();
    const [path, options] = client.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(path).toBe('/residents/');
    expect(options.params.get('page')).toBe('2');
    expect(options.params.get('search')).toBe('Ana');
    expect(options.params.get('status')).toBe('ACTIVE');
  });

  it('keeps create and update paths centralized and never calls delete', () => {
    const payload = { first_name: 'Ana' } as ResidentPayload;
    client.post.mockReturnValue(of({}));
    client.patch.mockReturnValue(of({}));

    api.create(payload).subscribe();
    api.update(12, payload).subscribe();

    expect(client.post).toHaveBeenCalledWith('/residents/', payload);
    expect(client.patch).toHaveBeenCalledWith('/residents/12/', payload);
    expect(client.delete).not.toHaveBeenCalled();
  });
});
