import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ResidentApi } from '../../paquete1_usuarios_condominio/cu05_residentes/resident.api';
import { ResidentPerson } from '../../paquete1_usuarios_condominio/cu05_residentes/resident.models';
import { FacialVerificationApi } from './facial-verification.api';
import {
  BiometricReferenceItem,
  FaceMatchResult,
  FaceVerificationLog,
} from './facial-verification.models';

@Component({
  selector: 'app-facial-verification-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './facial-verification.page.html',
  styleUrls: ['./facial-verification.page.scss'],
})
export class FacialVerificationPage implements OnInit, OnDestroy {
  private readonly facialApi = inject(FacialVerificationApi);
  private readonly residentApi = inject(ResidentApi);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  // Tabs
  activeTab = signal<'verify' | 'enroll' | 'history'>('verify');

  // Verification Scanner State
  capturedImage = signal<string | null>(null);
  cameraActive = signal<boolean>(false);
  isMatching = signal<boolean>(false);
  matchResult = signal<FaceMatchResult | null>(null);
  selectedTargetResidentId = signal<number | null>(null);
  confirmationNotes = signal<string>('');
  eventType = signal<'ENTRY' | 'EXIT'>('ENTRY');
  isSubmittingConfirmation = signal<boolean>(false);
  confirmationSuccessMsg = signal<string | null>(null);

  // Enrollment State
  residents = signal<ResidentPerson[]>([]);
  selectedEnrollResidentId = signal<number | null>(null);
  enrollPhotos = signal<string[]>([]);
  isEnrolling = signal<boolean>(false);
  enrollSuccessMsg = signal<string | null>(null);
  enrollErrorMsg = signal<string | null>(null);
  enrollmentHistory = signal<BiometricReferenceItem[]>([]);

  // Logs & History State
  verificationLogs = signal<FaceVerificationLog[]>([]);
  logResultFilter = signal<string>('');
  logSearchQuery = signal<string>('');
  isLoadingLogs = signal<boolean>(false);

  private mediaStream: MediaStream | null = null;

  ngOnInit(): void {
    this.loadResidents();
    this.loadVerificationLogs();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'verify' | 'enroll' | 'history'): void {
    this.activeTab.set(tab);
    this.confirmationSuccessMsg.set(null);
    this.enrollSuccessMsg.set(null);
    this.enrollErrorMsg.set(null);

    if (tab === 'history') {
      this.loadVerificationLogs();
    } else if (tab === 'enroll' && this.selectedEnrollResidentId()) {
      this.loadResidentBiometricHistory(this.selectedEnrollResidentId()!);
    }
  }

  // --- CAMERA MANAGEMENT ---
  async startCamera(): Promise<void> {
    try {
      this.stopCamera();
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error(
          'El navegador bloquea la cámara web en HTTP con IP externa. Acceda por http://localhost:4200 o habilite HTTPS.'
        );
      }
      this.cameraActive.set(true);
      await new Promise((r) => setTimeout(r, 50));

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      const videoEl = this.videoElement?.nativeElement;
      if (videoEl) {
        videoEl.srcObject = this.mediaStream;
        await videoEl.play();
      }
    } catch (err: any) {
      console.warn('No se pudo acceder a la cámara web:', err);
      this.cameraActive.set(false);
      const msg = err.message || 'No se pudo activar la cámara web. Use "Subir Imagen" como alternativa.';
      if (this.activeTab() === 'enroll') {
        this.enrollErrorMsg.set(msg);
      } else {
        alert(msg);
      }
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
  }

  capturePhotoFromCamera(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) {
      console.warn('No se encontró el elemento de video activo.');
      return;
    }
    const canvas = this.canvasElement?.nativeElement || document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (this.activeTab() === 'verify') {
        this.capturedImage.set(dataUrl);
        this.matchResult.set(null);
        this.stopCamera();
      } else {
        this.addEnrollPhoto(dataUrl);
        if (this.enrollPhotos().length >= 5) {
          this.stopCamera();
        }
      }
    }
  }

  onFileSelected(event: Event, target: 'verify' | 'enroll'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (target === 'verify') {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.capturedImage.set(e.target?.result as string);
          this.matchResult.set(null);
        };
        reader.readAsDataURL(input.files[0]);
      } else {
        Array.from(input.files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const b64 = e.target?.result as string;
            if (b64) this.addEnrollPhoto(b64);
          };
          reader.readAsDataURL(file);
        });
      }
    }
  }

  addEnrollPhoto(b64: string): void {
    this.enrollPhotos.update((photos) => [...photos, b64]);
    this.enrollErrorMsg.set(null);
  }

  removeEnrollPhoto(index: number): void {
    this.enrollPhotos.update((photos) => photos.filter((_, i) => i !== index));
  }

  clearCapturedPhoto(): void {
    this.capturedImage.set(null);
    this.matchResult.set(null);
    this.confirmationSuccessMsg.set(null);
  }

  clearEnrollPhotos(): void {
    this.enrollPhotos.set([]);
    this.enrollSuccessMsg.set(null);
    this.enrollErrorMsg.set(null);
  }

  // --- FACIAL MATCHING ---
  runFaceMatch(): void {
    const img = this.capturedImage();
    if (!img) return;

    this.isMatching.set(true);
    this.matchResult.set(null);
    this.confirmationSuccessMsg.set(null);

    this.facialApi
      .matchFace({
        captured_image: img,
        target_resident_id: this.selectedTargetResidentId() || undefined,
        threshold: 0.45,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.matchResult.set(result);
          this.isMatching.set(false);
          this.loadVerificationLogs();
        },
        error: (err) => {
          console.error('Error al realizar coincidencia facial:', err);
          this.isMatching.set(false);
        },
      });
  }

  // --- HUMAN CONFIRMATION ---
  confirmIdentity(humanConfirmed: boolean): void {
    const img = this.capturedImage();
    const result = this.matchResult();
    if (!img || !result) return;

    this.isSubmittingConfirmation.set(true);

    this.facialApi
      .confirmVerification({
        captured_image: img,
        matched_resident_id: result.matched_resident?.id ?? null,
        biometric_reference_id: result.biometric_reference_id ?? null,
        similarity_score: result.similarity_score,
        threshold: result.threshold,
        result: result.result,
        human_confirmed: humanConfirmed,
        create_access_event: humanConfirmed && result.result !== 'NO_MATCH',
        event_type: this.eventType(),
        notes: this.confirmationNotes(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (log) => {
          this.isSubmittingConfirmation.set(false);
          const msg = humanConfirmed
            ? `Identidad de ${result.matched_resident?.full_name || 'Residente'} CONFIRMADA y registrada exitosamente.`
            : 'Resultado de verificación RECHAZADO por confirmación humana.';
          this.confirmationSuccessMsg.set(msg);
          this.capturedImage.set(null);
          this.matchResult.set(null);
          this.confirmationNotes.set('');
          this.loadVerificationLogs();
        },
        error: (err) => {
          console.error('Error al guardar confirmación:', err);
          this.isSubmittingConfirmation.set(false);
        },
      });
  }

  // --- BIOMETRIC ENROLLMENT ---
  loadResidents(): void {
    this.residentApi
      .list({ page: 1, page_size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.residents.set(res.results || []);
        },
        error: (err) => console.error('Error al cargar residentes:', err),
      });
  }

  onEnrollResidentChange(residentId: number): void {
    this.selectedEnrollResidentId.set(residentId);
    if (residentId) {
      this.loadResidentBiometricHistory(residentId);
    } else {
      this.enrollmentHistory.set([]);
    }
  }

  loadResidentBiometricHistory(residentId: number): void {
    this.facialApi
      .getResidentBiometricHistory(residentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => this.enrollmentHistory.set(history),
        error: (err) => console.error('Error al cargar historial biométrico:', err),
      });
  }

  deleteBiometricReference(id: number): void {
    if (!confirm(`¿Está seguro de eliminar la versión biométrica #${id}?`)) return;
    this.facialApi
      .deleteBiometricReference(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const residentId = this.selectedEnrollResidentId();
          if (residentId) {
            this.loadResidentBiometricHistory(residentId);
          }
        },
        error: (err) => console.error('Error al eliminar referencia biométrica:', err),
      });
  }

  saveBiometricEnrollment(): void {
    const residentId = this.selectedEnrollResidentId();
    const photos = this.enrollPhotos();

    if (!residentId) {
      this.enrollErrorMsg.set('Seleccione primero un residente.');
      return;
    }

    if (photos.length < 5) {
      this.enrollErrorMsg.set(`Debes subir al menos 5 fotografías del residente para entrenar el modelo (actual: ${photos.length}/5).`);
      return;
    }

    this.isEnrolling.set(true);
    this.enrollSuccessMsg.set(null);
    this.enrollErrorMsg.set(null);

    this.facialApi
      .enrollBiometric({ resident_id: residentId, images: photos })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newRef) => {
          this.isEnrolling.set(false);
          this.enrollSuccessMsg.set(
            `Patrón biométrico facial InsightFace 512-D registrado exitosamente para ${newRef.resident_detail.full_name} (${photos.length} fotos entrenadas).`
          );
          this.enrollPhotos.set([]);
          this.loadResidentBiometricHistory(residentId);
        },
        error: (err) => {
          this.isEnrolling.set(false);
          const errorMsg = err.error?.detail || err.error?.images?.[0] || 'Error procesando las imágenes para el entrenamiento biométrico.';
          this.enrollErrorMsg.set(errorMsg);
        },
      });
  }

  // --- LOGS & BITÁCORA ---
  loadVerificationLogs(): void {
    this.isLoadingLogs.set(true);
    this.facialApi
      .getVerificationLogs(this.logResultFilter(), this.logSearchQuery())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs: any) => {
          const list = Array.isArray(logs) ? logs : logs?.results || [];
          this.verificationLogs.set(list);
          this.isLoadingLogs.set(false);
        },
        error: (err) => {
          console.error('Error al cargar bitácora de verificaciones:', err);
          this.isLoadingLogs.set(false);
        },
      });
  }

  getScorePercentage(score: number | null): string {
    if (score === null || score === undefined) return '0%';
    return `${Math.round(score * 100)}%`;
  }
}
