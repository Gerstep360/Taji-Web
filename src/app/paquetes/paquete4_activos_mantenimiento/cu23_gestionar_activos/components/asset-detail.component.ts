import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { IconComponent } from '../../../../shared/ui/icon.component';
import { AssetState } from '../services/asset.state';
import { AssetStatus } from '../models/asset.models';

@Component({
  selector: 'taji-asset-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="asset-detail-container">
      <div class="detail-header">
        <button (click)="goBack()" class="btn-back">
          <taji-icon name="arrow-left" [size]="18" />
          <span>Volver</span>
        </button>
        <div class="header-title">
          @if (!assetState.isLoading()) {
            <h1>{{ assetState.selectedAsset()?.name }}</h1>
            <p class="code">{{ assetState.selectedAsset()?.code }}</p>
          }
        </div>
        <div class="header-actions">
          <a
            [routerLink]="'/inventario-activos/' + assetState.selectedAsset()?.id + '/editar'"
            class="btn-secondary"
          >
            <taji-icon name="edit" [size]="16" />
            <span>Editar</span>
          </a>
          <button (click)="showQR()" class="btn-secondary" *ngIf="assetState.selectedAsset()">
            <taji-icon name="qr-code" [size]="16" />
            <span>Ver QR</span>
          </button>
        </div>
      </div>

      @if (assetState.isLoading()) {
        <div class="loading-state">
          <p>Cargando detalle...</p>
        </div>
      } @else if (assetState.selectedAsset()) {
        <div class="detail-content">
          <!-- Información Básica -->
          <section class="detail-section">
            <h2>Información Básica</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Código</span>
                <span class="value code">{{ assetState.selectedAsset()!.code }}</span>
              </div>
              <div class="info-item">
                <span class="label">Nombre</span>
                <span class="value">{{ assetState.selectedAsset()!.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">Estado</span>
                <span
                  class="status-badge"
                  [class]="'status-' + assetState.selectedAsset()!.status.toLowerCase()"
                >
                  {{ getStatusLabel(assetState.selectedAsset()!.status) }}
                </span>
              </div>
              <div class="info-item full-width">
                <span class="label">Descripción</span>
                <span class="value">
                  {{ assetState.selectedAsset()!.description || '—' }}
                </span>
              </div>
            </div>
          </section>

          <!-- Clasificación -->
          <section class="detail-section">
            <h2>Clasificación</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Tipo</span>
                <span class="value">{{ assetState.selectedAsset()!.asset_type_name }}</span>
              </div>
              <div class="info-item">
                <span class="label">Sector / Ubicación</span>
                <span class="value">
                  {{ assetState.selectedAsset()!.sector_name || '—' }}
                </span>
              </div>
            </div>
          </section>

          <!-- Datos Técnicos -->
          <section class="detail-section">
            <h2>Datos Técnicos</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Marca</span>
                <span class="value">{{ assetState.selectedAsset()!.brand || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Modelo</span>
                <span class="value">{{ assetState.selectedAsset()!.model || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Número de Serie</span>
                <span class="value">
                  {{ assetState.selectedAsset()!.serial_number || '—' }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">Fecha de Instalación</span>
                <span class="value">
                  {{ formatDate(assetState.selectedAsset()!.installation_date) }}
                </span>
              </div>
            </div>
          </section>

          <!-- Historial -->
          @if (assetState.assetHistory()) {
            <section class="detail-section">
              <h2>Historial</h2>

              <!-- Incidentes -->
              <div class="history-subsection">
                <h3>Incidentes ({{ assetState.assetHistory()!.incidents.length }})</h3>
                @if (assetState.assetHistory()!.incidents.length === 0) {
                  <p class="empty-message">Sin incidentes registrados</p>
                } @else {
                  <div class="history-list">
                    @for (incident of assetState.assetHistory()!.incidents; track incident.id) {
                      <div class="history-item">
                        <span class="code">{{ incident.public_code }}</span>
                        <span class="title">{{ incident.title }}</span>
                        <span class="status">{{ incident.status }}</span>
                        <span class="date">{{ formatDate(incident.created_at) }}</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Órdenes de Trabajo -->
              <div class="history-subsection">
                <h3>Órdenes de Trabajo ({{ assetState.assetHistory()!.work_orders.length }})</h3>
                @if (assetState.assetHistory()!.work_orders.length === 0) {
                  <p class="empty-message">Sin órdenes de trabajo</p>
                } @else {
                  <div class="history-list">
                    @for (order of assetState.assetHistory()!.work_orders; track order.id) {
                      <div class="history-item">
                        <span class="code">{{ order.public_code }}</span>
                        <span class="title">{{ order.title }}</span>
                        <span class="status">{{ order.status }}</span>
                        <span class="date">{{ formatDate(order.created_at) }}</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Planes de Mantenimiento -->
              <div class="history-subsection">
                <h3>
                  Planes de Mantenimiento ({{
                    assetState.assetHistory()!.maintenance_plans.length
                  }})
                </h3>
                @if (assetState.assetHistory()!.maintenance_plans.length === 0) {
                  <p class="empty-message">Sin planes de mantenimiento</p>
                } @else {
                  <div class="history-list">
                    @for (plan of assetState.assetHistory()!.maintenance_plans; track plan.id) {
                      <div class="history-item">
                        <span class="title">{{ plan.name }}</span>
                        <span class="meta">Cada {{ plan.frequency_days }} días</span>
                        <span class="date">Próximo: {{ formatDate(plan.next_due_at) }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </section>
          }

          <!-- Metadatos -->
          <section class="detail-section metadata">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Creado</span>
                <span class="value small">
                  {{ formatDateTime(assetState.selectedAsset()!.created_at) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">Actualizado</span>
                <span class="value small">
                  {{ formatDateTime(assetState.selectedAsset()!.updated_at) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">UUID QR</span>
                <span class="value small code">
                  {{ assetState.selectedAsset()!.qr_uuid }}
                </span>
              </div>
            </div>
          </section>
        </div>
      } @else {
        <div class="empty-state">
          <p>Activo no encontrado</p>
          <button (click)="goBack()" class="btn-primary">Volver</button>
        </div>
      }

      <!-- QR Modal -->
      @if (showQRModal()) {
        <div class="modal-backdrop" (click)="showQRModal.set(false)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Código QR</h2>
              <button (click)="showQRModal.set(false)" class="btn-close">
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
                    [alt]="'QR for ' + assetState.selectedAsset()!.name"
                    class="qr-image"
                  />
                  <p class="qr-payload">{{ assetState.assetQR()!.payload }}</p>
                  <button (click)="downloadQR()" class="btn-secondary">
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
    .asset-detail-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin-bottom: 2rem;
      justify-content: space-between;
    }

    .detail-header > :first-child {
      order: -1;
    }

    .header-title h1 {
      margin: 0;
      font-size: 1.75rem;
    }

    .code {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0.5rem 0 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .detail-section {
      padding: 1.5rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
    }

    .detail-section h2 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 1rem;
      color: #1f2937;
    }

    .value.small {
      font-size: 0.875rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      width: fit-content;
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

    .history-subsection {
      margin-bottom: 1.5rem;
    }

    .history-subsection h3 {
      margin: 0 0 1rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-item {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .history-item .code {
      font-weight: 600;
      font-family: 'Courier New', monospace;
      min-width: 100px;
    }

    .history-item .title {
      flex: 1;
    }

    .history-item .status {
      padding: 0.25rem 0.5rem;
      background: white;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .history-item .date,
    .history-item .meta {
      color: #6b7280;
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .empty-message {
      color: #6b7280;
      font-style: italic;
      margin: 0;
    }

    .metadata {
      background: #f9fafb;
    }

    .btn-back,
    .btn-secondary,
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      color: #374151;
    }

    .btn-back:hover,
    .btn-secondary:hover {
      background: #f3f4f6;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem;
      color: #6b7280;
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
    }

    .btn-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
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
export class AssetDetailComponent implements OnInit {
  readonly assetState = inject(AssetState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  showQRModal = signal(false);

  ngOnInit(): void {
    const id = parseInt(this.route.snapshot.params['id'], 10);
    this.assetState.loadAssetDetail(id);
    this.assetState.loadAssetHistory(id);
  }

  showQR(): void {
    const id = this.assetState.selectedAsset()?.id;
    if (id) {
      this.assetState.loadAssetQR(id);
      this.showQRModal.set(true);
    }
  }

  downloadQR(): void {
    const qr = this.assetState.assetQR();
    const asset = this.assetState.selectedAsset();
    if (!qr || !asset) return;

    const element = document.createElement('a');
    element.href = `data:${qr.image_media_type};base64,${qr.image_base64}`;
    element.download = `qr-${asset.code}.svg`;
    element.click();
  }

  goBack(): void {
    this.router.navigateByUrl('/inventario-activos');
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
