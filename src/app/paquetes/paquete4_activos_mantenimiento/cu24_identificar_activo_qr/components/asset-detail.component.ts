import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetQRScanResponse } from '../models/asset-qr.models';

@Component({
  selector: 'taji-asset-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (asset) {
      <div class="asset-detail-container">
        <div class="detail-header">
          <h2>{{ asset.name }}</h2>
          <span class="asset-code">{{ asset.code }}</span>
        </div>

        <div class="status-badge" [class]="'status-' + asset.status.toLowerCase()">
          {{ formatStatus(asset.status) }}
        </div>

        <div class="detail-grid">
          <div class="detail-row">
            <span class="label">Tipo de activo</span>
            <span class="value">{{ asset.asset_type_name }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Sector</span>
            <span class="value">{{ asset.sector_name || '—' }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Descripción</span>
            <span class="value">{{ asset.description || '—' }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Marca</span>
            <span class="value">{{ asset.brand || '—' }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Modelo</span>
            <span class="value">{{ asset.model || '—' }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Número de serie</span>
            <span class="value monospace">{{ asset.serial_number || '—' }}</span>
          </div>

          <div class="detail-row">
            <span class="label">UUID del QR</span>
            <span class="value monospace">{{ asset.qr_uuid }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Registrado</span>
            <span class="value">{{ formatDate(asset.created_at) }}</span>
          </div>
        </div>

        <div class="detail-actions">
          <button type="button" (click)="loadHistory.emit(asset.id)" class="btn-primary">
            Ver historial
          </button>
          <button type="button" (click)="newScan.emit()" class="btn-secondary">
            Escanear otro
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .asset-detail-container {
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .detail-header {
      margin-bottom: 1.5rem;
    }

    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
    }

    .asset-code {
      display: inline-block;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      background-color: #f3f4f6;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      color: #6b7280;
    }

    .status-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .status-active {
      background-color: #dcfce7;
      color: #166534;
    }

    .status-maintenance {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-out_of_service {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .status-retired {
      background-color: #f3f4f6;
      color: #6b7280;
    }

    .detail-grid {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #f3f4f6;
      align-items: center;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .value {
      font-size: 0.95rem;
      color: #1f2937;
    }

    .value.monospace {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      background-color: #f9fafb;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .detail-actions {
      display: flex;
      gap: 0.75rem;
    }

    button {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background-color: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .btn-primary:hover {
      background-color: #2563eb;
    }

    .btn-secondary {
      background-color: white;
      color: #374151;
    }

    .btn-secondary:hover {
      background-color: #f9fafb;
    }
  `,
})
export class AssetDetailComponent {
  @Input() asset: AssetQRScanResponse | null = null;
  @Output() loadHistory = new EventEmitter<number>();
  @Output() newScan = new EventEmitter<void>();

  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      OUT_OF_SERVICE: 'Fuera de servicio',
      MAINTENANCE: 'En mantenimiento',
      RETIRED: 'Retirado',
    };
    return statusMap[status] || status;
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
