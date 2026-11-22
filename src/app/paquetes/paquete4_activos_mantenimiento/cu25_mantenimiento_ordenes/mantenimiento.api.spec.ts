import { HttpClient, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client.service';
import { AppConfigService } from '../../../core/api/app-config.service';
import { MantenimientoApi } from './mantenimiento.api';

describe('MantenimientoApi', () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  const http = { get: vi.fn() };
  const appConfig = { endpoint: vi.fn((path: string) => `https://api.test${path}`) };
  let api: MantenimientoApi;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        MantenimientoApi,
        { provide: ApiClient, useValue: client },
        { provide: HttpClient, useValue: http },
        { provide: AppConfigService, useValue: appConfig },
      ],
    });
    api = TestBed.inject(MantenimientoApi);
  });

  it('sends CU25 work-order filters and pagination to the API', () => {
    client.get.mockReturnValue(of({ results: [] }));

    api
      .listOrders({
        status: 'IN_PROGRESS',
        work_type: 'PREVENTIVE',
        asset: '12',
        search: 'bomba',
        date_from: '',
        page: 2,
      })
      .subscribe();

    expect(client.get).toHaveBeenCalledOnce();
    const [path, options] = client.get.mock.calls[0] as [
      string,
      { params: HttpParams },
    ];
    expect(path).toBe('/maintenance/orders/');
    expect(options.params.get('page_size')).toBe('100');
    expect(options.params.get('status')).toBe('IN_PROGRESS');
    expect(options.params.get('work_type')).toBe('PREVENTIVE');
    expect(options.params.get('asset')).toBe('12');
    expect(options.params.get('search')).toBe('bomba');
    expect(options.params.get('page')).toBe('2');
    expect(options.params.has('date_from')).toBe(false);
  });

  it('uses the CU25 routes and payloads for order actions', () => {
    client.post.mockReturnValue(of({}));
    client.patch.mockReturnValue(of({}));
    client.delete.mockReturnValue(of(undefined));

    api.createOrder({ title: 'Revisar bomba' }).subscribe();
    api.updateOrder(17, { title: 'Revisar válvulas' }).subscribe();
    api.assignOrder(17, { staff_id: 8, reason: 'Turno técnico' }).subscribe();
    api.changeStatus(17, 'IN_PROGRESS', 'Inicio de labores').subscribe();
    api.addCostItem(17, { description: 'Repuesto', quantity: 2, unit_cost: '15.00' }).subscribe();
    api.removeCostItem(17, 4).subscribe();

    expect(client.post).toHaveBeenNthCalledWith(1, '/maintenance/orders/', {
      title: 'Revisar bomba',
    });
    expect(client.patch).toHaveBeenCalledWith('/maintenance/orders/17/', {
      title: 'Revisar válvulas',
    });
    expect(client.post).toHaveBeenNthCalledWith(2, '/maintenance/orders/17/assign/', {
      staff_id: 8,
      reason: 'Turno técnico',
    });
    expect(client.post).toHaveBeenNthCalledWith(3, '/maintenance/orders/17/status/', {
      status: 'IN_PROGRESS',
      notes: 'Inicio de labores',
    });
    expect(client.post).toHaveBeenNthCalledWith(
      4,
      '/maintenance/orders/17/cost-items/',
      { description: 'Repuesto', quantity: 2, unit_cost: '15.00' },
    );
    expect(client.delete).toHaveBeenCalledWith(
      '/maintenance/orders/17/cost-items/4/',
    );
  });

  it('uploads evidence as multipart form data and downloads it as a blob', () => {
    client.post.mockReturnValue(of({}));
    http.get.mockReturnValue(of(new Blob()));
    const file = new File(['evidence'], 'bomba.jpg', { type: 'image/jpeg' });

    api.addAttachment(17, file, 'Sello deteriorado').subscribe();
    api.downloadAttachment(17, 3).subscribe();

    expect(client.post).toHaveBeenCalledOnce();
    const [path, body] = client.post.mock.calls[0] as [string, FormData];
    expect(path).toBe('/maintenance/orders/17/attachments/');
    const uploadedFile = body.get('file');
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe(file.name);
    expect(body.get('caption')).toBe('Sello deteriorado');
    expect(appConfig.endpoint).toHaveBeenCalledWith(
      '/maintenance/orders/17/download-attachment/?attachment_id=3',
    );
    expect(http.get).toHaveBeenCalledWith(
      'https://api.test/maintenance/orders/17/download-attachment/?attachment_id=3',
      { responseType: 'blob', withCredentials: true },
    );
  });
});
