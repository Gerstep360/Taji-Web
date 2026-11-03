import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../../core/api/api-endpoints';
import { AssetType } from '../models/asset.models';

@Injectable({
  providedIn: 'root',
})
export class AssetTypeApi {
  private readonly api = inject(ApiClient);

  listAssetTypes(params?: {
    search?: string;
    ordering?: string;
  }): Observable<{ results: AssetType[]; count: number }> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.ordering) httpParams = httpParams.set('ordering', params.ordering);

    return this.api.get<{ results: AssetType[]; count: number }>(
      API_ENDPOINTS.assets.types,
      { params: httpParams }
    );
  }

  getAssetType(id: number): Observable<AssetType> {
    return this.api.get<AssetType>(API_ENDPOINTS.assets.type(id));
  }

  createAssetType(data: Partial<AssetType>): Observable<AssetType> {
    return this.api.post<Partial<AssetType>, AssetType>(API_ENDPOINTS.assets.types, data);
  }

  updateAssetType(id: number, data: Partial<AssetType>): Observable<AssetType> {
    return this.api.patch<Partial<AssetType>, AssetType>(API_ENDPOINTS.assets.type(id), data);
  }

  deleteAssetType(id: number): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.assets.type(id));
  }
}
