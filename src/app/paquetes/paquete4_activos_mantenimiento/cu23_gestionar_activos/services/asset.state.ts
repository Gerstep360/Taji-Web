import { Injectable, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { AssetApi } from './asset.api';
import {
  Asset,
  AssetCreateRequest,
  AssetHistory,
  AssetQRResponse,
  AssetUpdateRequest,
  Sector,
} from '../models/asset.models';

@Injectable({
  providedIn: 'root',
})
export class AssetState {
  private readonly assetApi = inject(AssetApi);

  // Signal de activos en lista
  readonly assets = signal<Asset[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly totalCount = signal(0);

  // Signal de activo detalle
  readonly selectedAsset = signal<Asset | null>(null);
  readonly assetHistory = signal<AssetHistory | null>(null);
  readonly assetQR = signal<AssetQRResponse | null>(null);

  // Sectores disponibles para seleccionar
  readonly sectors = signal<Sector[]>([]);

  // Búsqueda y filtros
  readonly searchQuery = signal('');
  readonly statusFilter = signal<string | null>(null);
  readonly assetTypeFilter = signal<number | null>(null);
  readonly sectorFilter = signal<number | null>(null);

  // Paginación
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  // Computed
  readonly filteredAssets = computed(() => this.assets());
  readonly isLoadingMore = computed(() => this.isLoading());

  constructor() {
    // Limpiar estado al constructor (para cuando se reinicia)
  }

  /**
   * Carga lista de activos con filtros
   */
  loadAssets(reset = true): void {
    this.isLoading.set(true);
    this.error.set(null);

    if (reset) {
      this.currentPage.set(1);
    }

    const params: any = {
      search: this.searchQuery() || undefined,
      status: this.statusFilter() || undefined,
      asset_type: this.assetTypeFilter() || undefined,
      sector: this.sectorFilter() || undefined,
      ordering: '-created_at',
    };

    this.assetApi
      .listAssets(params)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.assets.set(response.results);
          this.totalCount.set(response.count);
          this.hasMore.set(response.results.length < response.count);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Error al cargar activos');
          this.isLoading.set(false);
          console.error('Error loading assets:', err);
        },
      });
  }

  /**
   * Obtiene detalle de un activo
   */
  loadAssetDetail(id: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.assetApi
      .getAsset(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (asset) => {
          this.selectedAsset.set(asset);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Error al cargar detalle del activo');
          this.isLoading.set(false);
          console.error('Error loading asset detail:', err);
        },
      });
  }

  /**
   * Obtiene historial de activo
   */
  loadAssetHistory(id: number): void {
    this.assetApi
      .getAssetHistory(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (history) => {
          this.assetHistory.set(history);
        },
        error: (err) => {
          console.error('Error loading asset history:', err);
        },
      });
  }

  /**
   * Obtiene imagen QR del activo
   */
  loadAssetQR(id: number): void {
    this.assetApi
      .getAssetQR(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (qr) => {
          this.assetQR.set(qr);
        },
        error: (err) => {
          console.error('Error loading asset QR:', err);
        },
      });
  }

  /**
   * Crea un nuevo activo
   */
  createAsset(data: AssetCreateRequest): Observable<Asset> {
    return new Observable((observer) => {
      this.assetApi.createAsset(data).subscribe({
        next: (asset) => {
          // Agregar a la lista
          this.assets.update((current) => [asset, ...current]);
          this.totalCount.update((count) => count + 1);
          observer.next(asset);
          observer.complete();
        },
        error: (err) => {
          console.error('Error creating asset:', err);
          observer.error(err);
        },
      });
    });
  }

  /**
   * Actualiza un activo existente
   */
  updateAsset(id: number, data: AssetUpdateRequest): Observable<Asset> {
    return new Observable((observer) => {
      this.assetApi.updateAsset(id, data).subscribe({
        next: (asset) => {
          // Actualizar en la lista
          this.assets.update((current) => current.map((a) => (a.id === id ? asset : a)));
          // Actualizar en detalle si está abierto
          if (this.selectedAsset()?.id === id) {
            this.selectedAsset.set(asset);
          }
          observer.next(asset);
          observer.complete();
        },
        error: (err) => {
          console.error('Error updating asset:', err);
          observer.error(err);
        },
      });
    });
  }

  /**
   * Retira un activo (soft delete -> RETIRED status)
   */
  retireAsset(id: number): Observable<void> {
    return new Observable((observer) => {
      this.assetApi.retireAsset(id).subscribe({
        next: () => {
          // Actualizar en la lista (marcar como RETIRED)
          this.assets.update((current) =>
            current.map((a) => (a.id === id ? { ...a, status: 'RETIRED' as const } : a)),
          );
          observer.next();
          observer.complete();
        },
        error: (err) => {
          console.error('Error retiring asset:', err);
          observer.error(err);
        },
      });
    });
  }

  /**
   * Limpia el estado
   */
  clear(): void {
    this.assets.set([]);
    this.selectedAsset.set(null);
    this.assetHistory.set(null);
    this.assetQR.set(null);
    this.error.set(null);
    this.isLoading.set(false);
    this.searchQuery.set('');
    this.statusFilter.set(null);
    this.assetTypeFilter.set(null);
    this.sectorFilter.set(null);
  }
}
