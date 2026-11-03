import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AssetQRApi } from './services/asset-qr.api';
import {
  AssetQRScanResponse,
  AssetHistory,
  QRScanState,
  QRScanError,
} from './models/asset-qr.models';
import { AssetQRScannerComponent } from './components/asset-qr-scanner.component';
import { AssetDetailComponent } from './components/asset-detail.component';
import { AssetHistoryComponent } from './components/asset-history.component';

@Component({
  selector: 'taji-asset-qr-page',
  standalone: true,
  imports: [
    CommonModule,
    AssetQRScannerComponent,
    AssetDetailComponent,
    AssetHistoryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="asset-qr-page" aria-labelledby="page-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Activos y Mantenimiento · CU24</span>
          <h1 id="page-title">Identificar Activo mediante QR</h1>
          <p>Escanea el código QR de un activo para ver sus detalles e historial de mantenimiento.</p>
        </div>
      </header>

      <!-- Error messages -->
      @if (error(); as err) {
        <div class="notice error" role="alert">
          <span>{{ err.message }}</span>
          <button type="button" (click)="resetError()" class="btn-close">×</button>
        </div>
      }

      <!-- Loading state -->
      @if (isLoading()) {
        <div class="loading-state" aria-label="Cargando...">
          <div class="spinner"></div>
          <p>{{ getLoadingMessage() }}</p>
        </div>
      }

      <!-- Main content (hidden during loading) -->
      @if (!isLoading()) {
        <!-- Initial scanner state -->
        @if (currentState() === 'INITIAL' || currentState() === 'SCANNING') {
          <taji-asset-qr-scanner (qrDetected)="onQRDetected($event)" />
        }

        <!-- Asset found -->
        @if (currentState() === 'SUCCESS') {
          <taji-asset-detail
            [asset]="scannedAsset()"
            (loadHistory)="onLoadHistory($event)"
            (newScan)="resetScan()"
          />
        }

        <!-- History view -->
        @if (currentState() === 'SUCCESS' && isShowingHistory()) {
          <taji-asset-history
            [history]="assetHistory()"
            (back)="closeHistory()"
          />
        }

        <!-- Not found -->
        @if (currentState() === 'NOT_FOUND') {
          <div class="not-found-container">
            <div class="empty-state">
              <span class="icon">⊗</span>
              <h2>Activo no encontrado</h2>
              <p>El código QR escaneado no corresponde a ningún activo en tu condominio.</p>
              <button type="button" (click)="resetScan()" class="btn-retry">
                Intentar de nuevo
              </button>
            </div>
          </div>
        }

        <!-- Unauthorized -->
        @if (currentState() === 'UNAUTHORIZED') {
          <div class="not-found-container">
            <div class="empty-state">
              <span class="icon">🔒</span>
              <h2>Acceso denegado</h2>
              <p>No tienes permisos para acceder a esta funcionalidad.</p>
            </div>
          </div>
        }

        <!-- Network error -->
        @if (currentState() === 'NETWORK_ERROR') {
          <div class="not-found-container">
            <div class="empty-state">
              <span class="icon">⚠</span>
              <h2>Error de conexión</h2>
              <p>No pudimos conectar con el servidor. Verifica tu conexión e intenta nuevamente.</p>
              <button type="button" (click)="resetScan()" class="btn-retry">
                Reintentar
              </button>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .asset-qr-page {
      padding: 0;
    }

    .page-heading {
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .page-heading > div {
      max-width: 1200px;
      margin: 0 auto;
    }

    .kicker {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 700;
    }

    .page-heading p {
      margin: 0;
      font-size: 1rem;
      opacity: 0.95;
      max-width: 500px;
    }

    .notice {
      margin: 1.5rem auto;
      max-width: 1200px;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .notice.error {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: inherit;
      padding: 0;
      line-height: 1;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 1rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f4f6;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .loading-state p {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .not-found-container {
      padding: 3rem 2rem;
      display: flex;
      justify-content: center;
    }

    .empty-state {
      text-align: center;
      max-width: 400px;
    }

    .empty-state .icon {
      display: block;
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      color: #1f2937;
    }

    .empty-state p {
      margin: 0 0 1.5rem;
      color: #6b7280;
    }

    .btn-retry {
      padding: 0.75rem 1.5rem;
      background-color: #667eea;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-retry:hover {
      background-color: #5568d3;
    }
  `,
})
export class AssetQRPage implements OnInit {
  private readonly api = inject(AssetQRApi);

  currentState = signal<QRScanState>('INITIAL');
  isLoading = signal(false);
  error = signal<QRScanError | null>(null);
  scannedAsset = signal<AssetQRScanResponse | null>(null);
  assetHistory = signal<AssetHistory | null>(null);
  isShowingHistory = signal(false);

  ngOnInit(): void {
    // Component initializes ready for scanning
  }

  onQRDetected(qrPayload: string): void {
    this.currentState.set('PROCESSING');
    this.isLoading.set(true);
    this.error.set(null);

    this.api
      .scanQR({ qr_payload: qrPayload })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (asset) => {
          this.scannedAsset.set(asset);
          this.currentState.set('SUCCESS');
        },
        error: (err) => {
          this.handleScanError(err);
        },
      });
  }

  onLoadHistory(assetId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.api
      .getAssetHistory(assetId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (history) => {
          this.assetHistory.set(history);
          this.isShowingHistory.set(true);
          this.currentState.set('SUCCESS');
        },
        error: (err) => {
          this.handleHistoryError(err);
        },
      });
  }

  resetScan(): void {
    this.currentState.set('INITIAL');
    this.scannedAsset.set(null);
    this.assetHistory.set(null);
    this.isShowingHistory.set(false);
    this.error.set(null);
  }

  closeHistory(): void {
    this.isShowingHistory.set(false);
  }

  resetError(): void {
    this.error.set(null);
    if (this.currentState() === 'ERROR') {
      this.resetScan();
    }
  }

  getLoadingMessage(): string {
    const state = this.currentState();
    if (state === 'PROCESSING') return 'Validando código QR...';
    if (state === 'LOADING_HISTORY') return 'Cargando historial del activo...';
    return 'Procesando...';
  }

  private handleScanError(err: any): void {
    if (err.status === 404) {
      this.currentState.set('NOT_FOUND');
      this.error.set({
        code: 'NOT_FOUND',
        message: 'El activo no fue encontrado.',
      });
    } else if (err.status === 401 || err.status === 403) {
      this.currentState.set('UNAUTHORIZED');
      this.error.set({
        code: 'UNAUTHORIZED',
        message: 'No tienes permisos para acceder a esta funcionalidad.',
      });
    } else if (err.status === 400) {
      this.currentState.set('INITIAL');
      this.error.set({
        code: 'INVALID_FORMAT',
        message: 'Formato de QR inválido. Intenta de nuevo.',
      });
    } else if (err.status === 0) {
      this.currentState.set('NETWORK_ERROR');
      this.error.set({
        code: 'NETWORK',
        message: 'Error de conexión. Verifica tu conexión a internet.',
      });
    } else {
      this.currentState.set('INITIAL');
      this.error.set({
        code: 'UNKNOWN',
        message: 'Ocurrió un error. Por favor, intenta de nuevo.',
      });
    }
  }

  private handleHistoryError(err: any): void {
    this.isShowingHistory.set(false);
    this.currentState.set('SUCCESS');
    this.error.set({
      code: 'UNKNOWN',
      message: 'No pudimos cargar el historial del activo. Intenta de nuevo.',
    });
  }
}
