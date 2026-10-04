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
  enrollImage = signal<string | null>(null);
  isEnrolling = signal<boolean>(false);
  enrollSuccessMsg = signal<string | null>(null);
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
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
        this.cameraActive.set(true);
      }
    } catch (err) {
      console.warn('No se pudo acceder a la cámara web:', err);
      this.cameraActive.set(false);
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
    if (!this.videoElement || !this.canvasElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (this.activeTab() === 'verify') {
        this.capturedImage.set(dataUrl);
        this.matchResult.set(null);
      } else {
        this.enrollImage.set(dataUrl);
      }
    }
    this.stopCamera();
  }

  onFileSelected(event: Event, target: 'verify' | 'enroll'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (target === 'verify') {
          this.capturedImage.set(result);
          this.matchResult.set(null);
        } else {
          this.enrollImage.set(result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  clearCapturedPhoto(): void {
    this.capturedImage.set(null);
    this.matchResult.set(null);
    this.confirmationSuccessMsg.set(null);
  }

  clearEnrollPhoto(): void {
    this.enrollImage.set(null);
    this.enrollSuccessMsg.set(null);
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
        threshold: 0.7,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.matchResult.set(result);
          this.isMatching.set(false);
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

  saveBiometricEnrollment(): void {
    const residentId = this.selectedEnrollResidentId();
    const image = this.enrollImage();
    if (!residentId || !image) return;

    this.isEnrolling.set(true);
    this.enrollSuccessMsg.set(null);

    this.facialApi
      .enrollBiometric({ resident_id: residentId, reference_image: image })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newRef) => {
          this.isEnrolling.set(false);
          this.enrollSuccessMsg.set(
            `Referencia biométrica v${newRef.id} registrada correctamente para ${newRef.resident_detail.full_name}.`
          );
          this.enrollImage.set(null);
          this.loadResidentBiometricHistory(residentId);
        },
        error: (err) => {
          console.error('Error al enrolar referencia biométrica:', err);
          this.isEnrolling.set(false);
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
        next: (logs) => {
          this.verificationLogs.set(logs);
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
