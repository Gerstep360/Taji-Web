import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiClient } from '../../../core/api/api-client.service';

interface ValidationResult {
  valid: boolean;
  code: string;
  reason: string;
  authorization_id?: number;
  visitor_name?: string;
  visitor_document?: string;
  unit_code?: string;
  authorizer_name?: string;
  valid_until?: string;
}

@Component({
  selector: 'app-control-accesos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control-accesos.page.html',
  styleUrls: ['./control-accesos.page.scss'],
})
export class ControlAccesosPage implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly qrTokenInput = signal<string>('');
  readonly cameraActive = signal<boolean>(false);
  readonly validating = signal<boolean>(false);
  readonly result = signal<ValidationResult | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  private mediaStream: MediaStream | null = null;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // --- CAMERA MANAGEMENT ---
  async startCamera(): Promise<void> {
    try {
      this.stopCamera();
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error(
          'Acceso a cámara no disponible en HTTP con IP externa. Use http://localhost:4200 o ingrese el código manualmente.'
        );
      }
      this.cameraActive.set(true);
      await new Promise((r) => setTimeout(r, 50));

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
        this.errorMsg.set(null);
      }
    } catch (err: any) {
      console.warn('No se pudo activar la cámara:', err);
      this.cameraActive.set(false);
      this.errorMsg.set(err.message || 'No fue posible acceder a la cámara web.');
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
  }

  captureAndScan(): void {
    if (!this.videoElement || !this.canvasElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
  }

  // --- VALIDATION LOGIC ---
  validateQr(customToken?: string): void {
    const token = (customToken || this.qrTokenInput()).trim();
    if (!token) return;

    this.qrTokenInput.set(token);
    this.validating.set(true);
    this.result.set(null);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.api
      .post<any, ValidationResult>('/visit-qr/validate/', { token })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.validating.set(false);
          if (res.valid) {
            this.successMsg.set(`Acceso APROBADO para ${res.visitor_name || 'Visitante'}.`);
            this.stopCamera();
          } else {
            this.errorMsg.set(`Acceso DENEGADO: ${res.reason || 'Código inválido o vencido.'}`);
          }
        },
        error: (err) => {
          this.errorMsg.set(err.error?.detail || 'No fue posible validar el código QR escaneado.');
          this.validating.set(false);
        },
      });
  }

  resetScanner(): void {
    this.qrTokenInput.set('');
    this.result.set(null);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.stopCamera();
  }
}
