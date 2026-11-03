import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../../core/api/api-endpoints';
import {
  Asset,
  AssetCreateRequest,
  AssetHistory,
  AssetQRResponse,
  AssetUpdateRequest,
} from '../models/asset.models';

@Injectable({
  providedIn: 'root',
})
export class AssetApi {
  private readonly api = inject(ApiClient);

  listAssets(params?: {
    search?: string;
    status?: string;
    asset_type?: number;
    sector?: number;
    ordering?: string;
  }): Observable<{ results: Asset[]; count: number }> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.asset_type) httpParams = httpParams.set('asset_type', params.asset_type.toString());
    if (params?.sector) httpParams = httpParams.set('sector', params.sector.toString());
    if (params?.ordering) httpParams = httpParams.set('ordering', params.ordering);

    return this.api.get<{ results: Asset[]; count: number }>(API_ENDPOINTS.assets.list, {
      params: httpParams,
    });
  }

  getAsset(id: number): Observable<Asset> {
    return this.api.get<Asset>(API_ENDPOINTS.assets.detail(id));
  }

  createAsset(data: AssetCreateRequest): Observable<Asset> {
    return this.api.post<AssetCreateRequest, Asset>(API_ENDPOINTS.assets.root, data);
  }

  updateAsset(id: number, data: AssetUpdateRequest): Observable<Asset> {
    return this.api.patch<AssetUpdateRequest, Asset>(API_ENDPOINTS.assets.detail(id), data);
  }

  retireAsset(id: number): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.assets.detail(id));
  }

  getAssetQR(id: number): Observable<AssetQRResponse> {
    return this.api.get<AssetQRResponse>(API_ENDPOINTS.assets.qr(id));
  }

  getAssetHistory(id: number): Observable<AssetHistory> {
    return this.api.get<AssetHistory>(API_ENDPOINTS.assets.history(id));
  }
}
