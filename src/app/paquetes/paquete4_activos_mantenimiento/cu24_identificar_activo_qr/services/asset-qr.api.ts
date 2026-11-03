import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../../core/api/api-endpoints';
import { AssetQRScanRequest, AssetQRScanResponse, AssetHistory } from '../models/asset-qr.models';

@Injectable({
  providedIn: 'root',
})
export class AssetQRApi {
  private readonly api = inject(ApiClient);

  /**
   * Escanea un código QR y retorna los datos del activo.
   *
   * POST /api/v1/assets/scan/
   * {
   *   "qr_payload": "TAJI-ASSET.<uuid_hex>"
   * }
   */
  scanQR(request: AssetQRScanRequest): Observable<AssetQRScanResponse> {
    return this.api.post<AssetQRScanRequest, AssetQRScanResponse>(
      API_ENDPOINTS.assets.scan,
      request
    );
  }

  /**
   * Obtiene el historial de un activo (incidencias, órdenes de trabajo, planes de mantenimiento).
   *
   * GET /api/v1/assets/{id}/history/
   */
  getAssetHistory(assetId: number): Observable<AssetHistory> {
    return this.api.get(API_ENDPOINTS.assets.history(assetId));
  }
}
