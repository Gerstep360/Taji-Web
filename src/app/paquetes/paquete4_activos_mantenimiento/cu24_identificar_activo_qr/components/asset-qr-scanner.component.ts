import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import jsQR from 'jsqr';

@Component({
  selector: 'taji-asset-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-scanner-container">
      <div class="scanner-panel">
        <h3>Escanear código QR</h3>
        <p class="scanner-hint">Apunta la cámara al código QR o ingresa el código manualmente.</p>

        <!-- Video stream -->
        <div class="video-wrapper" [class.hidden]="!isCameraActive()">
          <video
            #videoElement
            autoplay
            playsinline
            class="camera-feed"
            [attr.aria-label]="'Vista de cámara para escanear código QR'"
          ></video>
          <canvas #canvasElement class="hidden"></canvas>
          <div class="focus-indicator"></div>
        </div>

        <!-- Manual input -->
        <div class="input-section">
          <label for="qr-input">Código QR (manual):</label>
          <input
            id="qr-input"
            type="text"
            [(ngModel)]="manualQRCode"
            (keyup.enter)="submitManualQR()"
            placeholder="TAJI-ASSET.xxxxxxxx"
            class="qr-input"
          />
        </div>

        <!-- Camera permission status -->
        @if (cameraError()) {
          <div class="notice error" role="alert">
            <span>{{ cameraError() }}</span>
          </div>
        }

        <!-- Actions -->
        <div class="scanner-actions">
          <button
            type="button"
            (click)="toggleCamera()"
            [disabled]="isProcessing()"
            class="btn-camera"
          >
            @if (!isCameraActive()) {
              <span>Activar cámara</span>
            } @else {
              <span>Detener cámara</span>
            }
          </button>
          <button
            type="button"
            (click)="submitManualQR()"
            [disabled]="!manualQRCode || isProcessing()"
            class="btn-submit"
          >
            Validar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .qr-scanner-container {
      padding: 1rem 0;
    }

    .scanner-panel {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      max-width: 500px;
      margin: 0 auto;
    }

    h3 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .scanner-hint {
      margin: 0 0 1.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .video-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      background: #000;
      border-radius: 0.5rem;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .video-wrapper.hidden {
      display: none;
    }

    canvas {
      display: none;
    }

    .camera-feed {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .focus-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      border: 2px solid rgba(59, 130, 246, 0.5);
      border-radius: 0.5rem;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 0.5;
      }
      50% {
        opacity: 1;
      }
    }

    .input-section {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .qr-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .qr-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .notice {
      padding: 1rem;
      border-radius: 0.375rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    .notice.error {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .scanner-actions {
      display: flex;
      gap: 0.75rem;
    }

    button {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background-color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-submit {
      background-color: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .btn-submit:hover:not(:disabled) {
      background-color: #2563eb;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class AssetQRScannerComponent implements OnInit, OnDestroy {
  @Output() qrDetected = new EventEmitter<string>();
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  isCameraActive = signal(false);
  isProcessing = signal(false);
  cameraError = signal<string | null>(null);
  manualQRCode = '';

  private mediaStream: MediaStream | null = null;
  private cameraRevision = 0;
  private scanAnimationId: number | null = null;
  private lastDetectedQR: string | null = null;
  private detectionCooldown = false;
  private destroy$ = new Subject<void>();

  constructor() {
    afterNextRender(() => {
      if (this.isCameraActive()) {
        this.startQRScanning();
      }
    });
  }

  ngOnInit(): void {
    // Check for camera permission on init
    this.checkCameraSupport();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async toggleCamera(): Promise<void> {
    if (this.isCameraActive()) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  private async startCamera(): Promise<void> {
    const revision = ++this.cameraRevision;
    try {
      this.cameraError.set(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (revision !== this.cameraRevision) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.mediaStream = stream;
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.isCameraActive.set(true);
        // Start QR scanning after video loads
        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.startQRScanning();
        };
      }
    } catch (err: any) {
      if (revision !== this.cameraRevision) return;
      let message = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError') {
        message = 'Permiso de cámara denegado. Verifica los permisos del navegador.';
      } else if (err.name === 'NotFoundError') {
        message = 'No se encontró ninguna cámara en este dispositivo.';
      }
      this.cameraError.set(message);
      this.isCameraActive.set(false);
    }
  }

  private stopCamera(): void {
    this.cameraRevision++;
    // Stop QR scanning animation loop
    if (this.scanAnimationId !== null) {
      cancelAnimationFrame(this.scanAnimationId);
      this.scanAnimationId = null;
    }
    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    // Clear video element
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    this.isCameraActive.set(false);
  }

  private startQRScanning(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let lastScan = 0;
    const scanFrame = () => {
      if (!this.isCameraActive()) return;
      if (
        !video.videoWidth ||
        !video.videoHeight ||
        video.readyState < 2 ||
        performance.now() - lastScan < 120
      ) {
        this.scanAnimationId = requestAnimationFrame(scanFrame);
        return;
      }
      lastScan = performance.now();

      // Update canvas size if video dimensions changed
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = Math.min(video.videoWidth, 640);
        canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth);
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Decode QR code
      const code = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && !this.detectionCooldown) {
        const payload = code.data;

        // Validate format: TAJI-ASSET.<32-char-hex-uuid>
        if (this.validateQRFormat(payload) && payload !== this.lastDetectedQR) {
          this.lastDetectedQR = payload;
          this.detectionCooldown = true;

          // Prevent duplicate detections for 2 seconds
          setTimeout(() => {
            this.detectionCooldown = false;
          }, 2000);

          // Emit detected QR
          this.isProcessing.set(true);
          this.qrDetected.emit(payload);
          return;
        }
      }

      // Continue scanning
      this.scanAnimationId = requestAnimationFrame(scanFrame);
    };

    // Start scanning loop
    this.scanAnimationId = requestAnimationFrame(scanFrame);
  }

  submitManualQR(): void {
    if (this.isProcessing()) return;
    const code = this.manualQRCode.trim();
    if (!code) return;

    if (this.validateQRFormat(code)) {
      this.isProcessing.set(true);
      this.qrDetected.emit(code);
      this.manualQRCode = '';
      this.stopCamera();
      // Reset processing flag - parent component handles the rest
      setTimeout(() => this.isProcessing.set(false), 500);
    } else {
      this.cameraError.set('Formato de QR inválido. Debe ser: TAJI-ASSET.<código>');
    }
  }

  private validateQRFormat(code: string): boolean {
    // Format: TAJI-ASSET.<32-char-hex-uuid>
    // UUID hex format: exactly 32 hexadecimal characters
    const pattern = /^TAJI-ASSET\.[0-9a-fA-F]{32}$/;
    return pattern.test(code);
  }

  private checkCameraSupport(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraError.set('Tu navegador no soporta acceso a cámara. Usa la entrada manual.');
    }
  }
}
