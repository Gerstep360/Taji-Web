import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../../../shared/ui/icon.component';
import { AssetState } from '../services/asset.state';
import { Asset, AssetStatus } from '../models/asset.models';

@Component({
  selector: 'taji-asset-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="asset-list-container">
      <div class="asset-list-header">
        <h1>Inventario de Activos</h1>
        <a routerLink="/inventario-activos/nuevo" class="btn-primary">
          <taji-icon name="plus" [size]="16" />
          <span>Registrar Activo</span>
        </a>
      </div>

      <!-- Filtros -->
      <div class="filter-panel">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Buscar por código, nombre, marca, modelo..."
          class="search-input"
        />
        <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="filter-select">
          <option [value]="null">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="OUT_OF_SERVICE">Fuera de servicio</option>
          <option value="MAINTENANCE">Mantenimiento</option>
          <option value="RETIRED">Retirado</option>
        </select>
      </div>

      <!-- Loading state -->
      @if (assetState.isLoading()) {
        <div class="loading-state">
          <p>Cargando activos...</p>
        </div>
      } @else {
        <!-- Error state -->
        @if (assetState.error()) {
          <div class="error-state">
            <taji-icon name="alert-triangle" [size]="24" />
            <p>{{ assetState.error() }}</p>
            <button (click)="loadAssets()" class="btn-secondary">Reintentar</button>
          </div>
        } @else {
          <!-- Empty state -->
          @if (assetState.assets().length === 0) {
            <div class="empty-state">
              <taji-icon name="inbox" [size]="48" />
              <h2>No hay activos registrados</h2>
              <p>Comienza registrando tu primer activo</p>
              <a routerLink="/inventario-activos/nuevo" class="btn-primary">
                <span>Registrar Activo</span>
              </a>
            </div>
          } @else {
            <!-- Assets table -->
            <div class="table-wrapper">
              <table class="assets-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Sector</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (asset of assetState.assets(); track asset.id) {
                    <tr>
                      <td class="code-cell">
                        <code>{{ asset.code }}</code>
                      </td>
                      <td>{{ asset.name }}</td>
                      <td>{{ asset.asset_type_name }}</td>
                      <td>{{ asset.sector_name || '—' }}</td>
                      <td>
                        <span [class]="'status-badge status-' + asset.status.toLowerCase()">
                          {{ getStatusLabel(asset.status) }}
                        </span>
                      </td>
                      <td class="actions-cell">
                        <a
                          [routerLink]="'/inventario-activos/' + asset.id"
                          class="btn-icon"
                          title="Ver detalle"
                        >
                          <taji-icon name="eye" [size]="16" />
                        </a>
                        <a
                          [routerLink]="'/inventario-activos/' + asset.id + '/editar'"
                          class="btn-icon"
                          title="Editar"
                        >
                          <taji-icon name="edit" [size]="16" />
                        </a>
                        <button (click)="showQRModal(asset)" class="btn-icon" title="Ver código QR">
                          <taji-icon name="qr-code" [size]="16" />
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }

      <!-- QR Modal -->
      @if (selectedQRAsset()) {
        <div class="modal-backdrop" (click)="closeQRModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Código QR - {{ selectedQRAsset()!.name }}</h2>
              <button (click)="closeQRModal()" class="btn-close">
                <taji-icon name="x" [size]="20" />
              </button>
            </div>
            <div class="modal-body">
              @if (assetState.assetQR()) {
                <div class="qr-display">
                  <img
                    [src]="
                      'data:' +
                      assetState.assetQR()!.image_media_type +
                      ';base64,' +
                      assetState.assetQR()!.image_base64
                    "
                    [alt]="'QR Code for ' + selectedQRAsset()!.name"
                    class="qr-image"
                  />
                  <p class="qr-payload">{{ assetState.assetQR()!.payload }}</p>
                  <button (click)="downloadQR(selectedQRAsset()!.code)" class="btn-secondary">
                    <taji-icon name="download" [size]="16" />
                    <span>Descargar</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .asset-list-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .asset-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .asset-list-header h1 {
      margin: 0;
      font-size: 1.75rem;
    }

    .filter-panel {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-input,
    .filter-select {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
    }

    .filter-select {
      min-width: 180px;
    }

    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem;
      text-align: center;
      color: #6b7280;
    }

    .error-state {
      color: #991b1b;
      background-color: #fee2e2;
      border-radius: 0.5rem;
      padding: 2rem;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
    }

    .assets-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      font-size: 0.875rem;
    }

    .assets-table th {
      background: #f9fafb;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    .assets-table td {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .assets-table tr:hover {
      background-color: #f9fafb;
    }

    .code-cell code {
      background: #f3f4f6;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-active {
      background: #dcfce7;
      color: #166534;
    }

    .status-out_of_service {
      background: #fef3c7;
      color: #b45309;
    }

    .status-maintenance {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-retired {
      background: #f3f4f6;
      color: #374151;
    }

    .actions-cell {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f9fafb;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 0.5rem;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.125rem;
    }

    .btn-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .qr-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .qr-image {
      max-width: 100%;
      width: 250px;
      height: auto;
      background: white;
      border: 1px solid #e5e7eb;
      padding: 1rem;
      border-radius: 0.375rem;
    }

    .qr-payload {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      text-align: center;
      color: #6b7280;
      margin: 0;
    }
  `,
})
export class AssetListComponent implements OnInit {
  readonly assetState = inject(AssetState);

  searchQuery = '';
  statusFilter: AssetStatus | null = null;
  selectedQRAsset = signal<Asset | null>(null);

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    this.assetState.loadAssets();
  }

  onSearchChange(value: string): void {
    this.assetState.searchQuery.set(value);
    this.assetState.loadAssets(true);
  }

  onFilterChange(): void {
    this.assetState.statusFilter.set(this.statusFilter);
    this.assetState.loadAssets(true);
  }

  showQRModal(asset: Asset): void {
    this.selectedQRAsset.set(asset);
    this.assetState.loadAssetQR(asset.id);
  }

  closeQRModal(): void {
    this.selectedQRAsset.set(null);
  }

  downloadQR(assetCode: string): void {
    const qr = this.assetState.assetQR();
    if (!qr) return;

    const element = document.createElement('a');
    element.href = `data:${qr.image_media_type};base64,${qr.image_base64}`;
    element.download = `qr-${assetCode}.svg`;
    element.click();
  }

  getStatusLabel(status: AssetStatus): string {
    const labels: Record<AssetStatus, string> = {
      ACTIVE: 'Activo',
      OUT_OF_SERVICE: 'Fuera de servicio',
      MAINTENANCE: 'Mantenimiento',
      RETIRED: 'Retirado',
    };
    return labels[status];
  }
}
