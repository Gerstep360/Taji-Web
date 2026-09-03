import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client.service';
import { StaffApi } from './staff.api';
import { StaffListResponse, StaffPayload } from './staff.models';

describe('StaffApi', () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  let api: StaffApi;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [StaffApi, { provide: ApiClient, useValue: client }],
    });
    api = TestBed.inject(StaffApi);
  });

  it('sends pagination and active filters to the T016 list contract', () => {
    const response: StaffListResponse = {
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

    api
      .list({ page: 2, page_size: 10, search: 'Ana', staff_type: 'SECURITY', status: '' })
      .subscribe();

    expect(client.get).toHaveBeenCalledOnce();
    const [path, options] = client.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(path).toBe('/staff/');
    expect(options.params.get('page')).toBe('2');
    expect(options.params.get('search')).toBe('Ana');
    expect(options.params.get('staff_type')).toBe('SECURITY');
    expect(options.params.has('status')).toBe(false);
  });

  it('keeps create, update and delete paths centralized', () => {
    const payload = { first_name: 'Ana' } as StaffPayload;
    client.post.mockReturnValue(of({}));
    client.patch.mockReturnValue(of({}));
    client.delete.mockReturnValue(of(undefined));

    api.create(payload).subscribe();
    api.update(12, payload).subscribe();
    api.delete(12).subscribe();

    expect(client.post).toHaveBeenCalledWith('/staff/', payload);
    expect(client.patch).toHaveBeenCalledWith('/staff/12/', payload);
    expect(client.delete).toHaveBeenCalledWith('/staff/12/');
  });
});
