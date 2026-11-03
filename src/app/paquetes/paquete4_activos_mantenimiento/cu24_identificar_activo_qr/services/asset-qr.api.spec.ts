import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AssetQRApi } from './asset-qr.api';
import { ApiClient } from '../../../../core/api/api-client.service';
import { AppConfigService } from '../../../../core/api/app-config.service';
import { API_ENDPOINTS } from '../../../../core/api/api-endpoints';
import { AssetQRScanResponse, AssetHistory } from '../models/asset-qr.models';

describe('AssetQRApi', () => {
  let service: AssetQRApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AssetQRApi,
        ApiClient,
        {
          provide: AppConfigService,
          useValue: {
            endpoint: (path: string) => path,
            config: () => ({ requestTimeoutMs: 12000 }),
          },
        },
      ],
    });
    service = TestBed.inject(AssetQRApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('scanQR', () => {
    it('should POST to /assets/scan/ and return asset data', () => {
      const mockResponse: AssetQRScanResponse = {
        id: 1,
        code: 'ACT-001',
        name: 'Bomba de agua',
        description: 'Bomba principal',
        asset_type_name: 'Equipamiento',
        sector_name: 'Azotea',
        brand: 'Pentair',
        model: 'XB100',
        serial_number: 'SN-123456',
        status: 'ACTIVE',
        qr_uuid: 'a1b2c3d4e5f6',
        created_at: '2026-11-02T10:30:00Z',
      };

      service.scanQR({ qr_payload: 'TAJI-ASSET.a1b2c3d4e5f6' }).subscribe((response) => {
        expect(response.id).toBe(1);
        expect(response.code).toBe('ACT-001');
        expect(response.status).toBe('ACTIVE');
      });

      const req = httpMock.expectOne(API_ENDPOINTS.assets.scan);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ qr_payload: 'TAJI-ASSET.a1b2c3d4e5f6' });
      req.flush(mockResponse);
    });

    it('should handle 404 error for non-existent asset', () => {
      let errorOccurred = false;
      service.scanQR({ qr_payload: 'TAJI-ASSET.invalid' }).subscribe(
        () => expect(errorOccurred).toBe(true),
        (error) => {
          errorOccurred = true;
          expect(error.status).toBe(404);
        },
      );

      const req = httpMock.expectOne(API_ENDPOINTS.assets.scan);
      req.flush('Asset not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 400 error for invalid format', () => {
      let errorOccurred = false;
      service.scanQR({ qr_payload: 'INVALID-FORMAT' }).subscribe(
        () => expect(errorOccurred).toBe(true),
        (error) => {
          errorOccurred = true;
          expect(error.status).toBe(400);
        },
      );

      const req = httpMock.expectOne(API_ENDPOINTS.assets.scan);
      req.flush('Invalid QR format', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getAssetHistory', () => {
    it('should GET from /assets/{id}/history/ and return history data', () => {
      const assetId = 1;
      const mockHistory: AssetHistory = {
        asset_id: assetId,
        incidents: [
          {
            id: 101,
            public_code: 'INC-001',
            title: 'Falla de presión',
            status: 'open',
            created_at: '2026-11-01T09:00:00Z',
          },
        ],
        work_orders: [
          {
            id: 201,
            public_code: 'WO-001',
            title: 'Mantenimiento preventivo',
            work_type: 'PREVENTIVE',
            status: 'COMPLETED',
            scheduled_for: '2026-11-05T08:00:00Z',
            completed_at: '2026-11-05T10:30:00Z',
            created_at: '2026-10-28T12:00:00Z',
          },
        ],
        maintenance_plans: [
          {
            id: 301,
            name: 'Revisión trimestral',
            frequency_days: 90,
            last_completed_at: '2026-10-15T08:00:00Z',
            next_due_at: '2027-01-13T08:00:00Z',
            is_active: true,
          },
        ],
      };

      service.getAssetHistory(assetId).subscribe((response) => {
        expect(response.asset_id).toBe(assetId);
        expect(response.incidents.length).toBe(1);
        expect(response.work_orders.length).toBe(1);
        expect(response.maintenance_plans.length).toBe(1);
      });

      const req = httpMock.expectOne(API_ENDPOINTS.assets.history(assetId));
      expect(req.request.method).toBe('GET');
      req.flush(mockHistory);
    });

    it('should handle empty history', () => {
      const assetId = 2;
      const emptyHistory: AssetHistory = {
        asset_id: assetId,
        incidents: [],
        work_orders: [],
        maintenance_plans: [],
      };

      service.getAssetHistory(assetId).subscribe((response) => {
        expect(response.incidents.length).toBe(0);
        expect(response.work_orders.length).toBe(0);
        expect(response.maintenance_plans.length).toBe(0);
      });

      const req = httpMock.expectOne(API_ENDPOINTS.assets.history(assetId));
      req.flush(emptyHistory);
    });
  });
});
