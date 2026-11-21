import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  Asset,
  AssetFilters,
  AssetHistory,
  AssetQrCode,
  AssetType,
  AssetsPage,
  SectorOption,
} from './activos.models';

@Injectable({ providedIn: 'root' })
export class ActivosApi {
  private readonly api = inject(ApiClient);

  listAssets(filters: AssetFilters = {}) {
    let params = new HttpParams().set('page_size', '100');
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.api.get<AssetsPage<Asset>>(API_ENDPOINTS.assets.root, { params });
  }

  getAsset(id: number) {
    return this.api.get<Asset>(API_ENDPOINTS.assets.detail(id));
  }

  createAsset(payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, Asset>(API_ENDPOINTS.assets.root, payload);
  }

  updateAsset(id: number, payload: Record<string, unknown>) {
    return this.api.patch<Record<string, unknown>, Asset>(
      API_ENDPOINTS.assets.detail(id),
      payload,
    );
  }

  retireAsset(id: number) {
    return this.api.delete<void>(API_ENDPOINTS.assets.detail(id));
  }

  getQr(id: number) {
    return this.api.get<AssetQrCode>(API_ENDPOINTS.assets.qr(id));
  }

  getHistory(id: number) {
    return this.api.get<AssetHistory>(API_ENDPOINTS.assets.history(id));
  }

  listAssetTypes() {
    return this.api.get<AssetsPage<AssetType>>(API_ENDPOINTS.assets.types, {
      params: new HttpParams().set('page_size', '100'),
    });
  }

  createAssetType(payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, AssetType>(API_ENDPOINTS.assets.types, payload);
  }

  updateAssetType(id: number, payload: Record<string, unknown>) {
    return this.api.patch<Record<string, unknown>, AssetType>(
      API_ENDPOINTS.assets.type(id),
      payload,
    );
  }

  deleteAssetType(id: number) {
    return this.api.delete<void>(API_ENDPOINTS.assets.type(id));
  }

  listSectors() {
    return this.api.get<AssetsPage<SectorOption>>(API_ENDPOINTS.sectors.root, {
      params: new HttpParams().set('page_size', '100'),
    });
  }
}
