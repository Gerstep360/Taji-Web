import { HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';
import { AuthService } from '../../../core/auth/auth.service';
import { coversGuide, Detection, EventCooldown, guide, labels, loadDetector, PlateConsensus } from './vision';
import { VisualPanel } from './visual-panel';

export type Vehicle = {
  id?: number;
  plate: string;
  description: string;
  user?: number | null;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  unit_info?: string;
};

@Component({
  selector: 'app-webcam-demo',
  imports: [DatePipe, PercentPipe, RouterLink, VisualPanel],
  templateUrl: './webcam.page.html',
  styleUrl: './webcam.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:visibilitychange)': 'visibilityChanged()', '(window:pagehide)': 'stop()' },
})
export class WebcamPage {
  private readonly api = inject(ApiClient);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly visual = viewChild(VisualPanel);
  readonly cameraActive = signal(false);
  readonly state = signal('Apagada');
  readonly error = signal('');
  readonly boxes = signal<Detection[]>([]);
  readonly detectedVehicleBox = signal<Detection | null>(null);
  readonly ratio = signal('16 / 9');
  readonly events = signal<{ label: string; at: number }[]>([]);
  readonly ocrEnabled = signal(false);
  readonly plateState = signal('Sin lectura');
  readonly plate = signal<string | null>(null);
  readonly vehicle = signal<Vehicle | null>(null);
  readonly guide = guide;
  readonly labels = labels;
  private stream?: MediaStream;
  private detector?: ObjectDetection;
  private loading?: Promise<ObjectDetection>;
  private timer?: ReturnType<typeof setTimeout>;
  private request?: Subscription;
  private requestEpoch = 0;
  private epoch = 0;
  private runningInference = false;
  private destroyed = false;
  private lastRead = -Infinity;
  private wasInGuide = false;
  private attempts = 0;
  private verified = false;
  private readonly consensus = new PlateConsensus();
  private readonly cooldown = new EventCooldown();

  constructor() {
    const auth = inject(AuthService);
    let tenantId = auth.activeTenant()?.id;
    effect(() => {
      const next = auth.activeTenant()?.id;
      if (next !== tenantId) untracked(() => this.stop());
      tenantId = next;
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.stop();
      if (!this.runningInference) this.disposeDetector();
    });
  }

  private disposeDetector() {
    this.detector?.dispose();
    this.detector = undefined;
  }

  async start() {
    if (this.stream || this.state() === 'Solicitando permiso' || this.runningInference) return;
    const run = ++this.epoch;
    this.error.set('');
    if (!navigator.mediaDevices?.getUserMedia) {
      this.state.set('Error');
      this.error.set('Abre Taji por HTTPS o localhost en un navegador con acceso a cámara.');
      return;
    }
    this.state.set('Solicitando permiso');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      if (run !== this.epoch) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (run !== this.epoch) return;
        this.stop();
        this.state.set('Sin cámara');
        this.error.set('La cámara se desconectó. Conéctala y vuelve a iniciar.');
      }, { once: true }));
      const video = this.video()!.nativeElement;
      video.srcObject = stream;
      await video.play();
      if (run !== this.epoch) return;
      this.cameraActive.set(true);
      this.ratio.set(video.videoWidth + ' / ' + video.videoHeight);
      this.state.set('Cargando IA');
      if (!this.detector) {
        this.loading ??= loadDetector().finally(() => { this.loading = undefined; });
        const detector = await this.loading;
        if (this.destroyed || !this.stream) { detector.dispose(); return; }
        this.detector = detector;
      }
      if (run !== this.epoch) return;
      void this.tick(run, video, document.createElement('canvas'));
    } catch (error) {
      if (run !== this.epoch) return;
      console.warn('CU32: inicio de cámara o detector:', error);
      this.stop();
      const name = error instanceof Error ? error.name : '';
      this.state.set(name === 'NotFoundError' ? 'Sin cámara' : 'Error');
      this.error.set(name === 'NotAllowedError' ? 'Permite la cámara desde el icono de permisos del navegador.'
        : name === 'NotFoundError' ? 'Conecta una webcam y vuelve a intentar.'
        : name === 'NotReadableError' ? 'La cámara está ocupada. Cierra la aplicación que la usa.'
        : 'No se pudo iniciar la cámara o cargar el modelo. Revisa tu conexión y vuelve a intentar.');
    }
  }

  stop() {
    ++this.epoch;
    this.cameraActive.set(false);
    this.visual()?.stop();
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    if (!this.runningInference) this.disposeDetector();
    const video = this.video()?.nativeElement;
    if (video?.srcObject) { video.pause(); video.srcObject = null; }
    this.boxes.set([]);
    this.state.set('Apagada');
    this.resetPlate();
    this.cooldown.reset();
    this.events.set([]);
  }

  visibilityChanged() { if (document.hidden) this.stop(); }

  toggleOcr(enabled: boolean) {
    this.ocrEnabled.set(enabled);
    this.resetPlate();
  }

  private resetPlate() {
    ++this.requestEpoch;
    this.request?.unsubscribe();
    this.request = undefined;
    this.consensus.reset();
    this.attempts = 0;
    this.verified = false;
    this.wasInGuide = false;
    this.plate.set(null);
    this.vehicle.set(null);
    this.plateState.set('Sin lectura');
  }

  private async tick(run: number, video: HTMLVideoElement, frame: HTMLCanvasElement) {
    if (run !== this.epoch || !this.detector) return;
    this.runningInference = true;
    const started = performance.now();
    try {
      const width = Math.min(480, video.videoWidth);
      const height = Math.round(width * video.videoHeight / video.videoWidth);
      if (frame.width !== width || frame.height !== height) { frame.width = width; frame.height = height; }
      frame.getContext('2d')!.drawImage(video, 0, 0, width, height);
      const results = await this.detector.detect(frame, 20, .55);
      if (run !== this.epoch) return;
      this.state.set('Reconociendo');
      const boxes = results.filter(result => Object.hasOwn(labels, result.class)).map(({class: kind, score, bbox: [x,y,w,h]}) =>
        ({ kind, score, x: x / width, y: y / height, w: w / width, h: h / height }));
      this.boxes.set(boxes);
      for (const kind of new Set(boxes.map(box => box.kind))) this.log(kind, labels[kind] + ': detección');
      if (this.ocrEnabled()) this.maybeRead(video, boxes);
    } catch {
      if (run === this.epoch) {
        this.stop();
        this.state.set('Error');
        this.error.set('El detector se interrumpió. Reinicia la cámara.');
        this.disposeDetector();
      }
    } finally {
      this.runningInference = false;
      if (run !== this.epoch) this.disposeDetector();
      if (run === this.epoch) this.timer = setTimeout(() => void this.tick(run, video, frame),
        Math.max(70, 300 - (performance.now() - started)));
    }
  }

  private log(key: string, label: string) {
    const at = Date.now();
    if (this.cooldown.accept(key, at)) this.events.update(items => [{ label, at }, ...items].slice(0, 8));
  }

  isVehicle(kind: string): boolean {
    return ['car', 'truck', 'bus', 'motorcycle'].includes(kind);
  }

  retryPlateDetection() {
    this.resetPlate();
  }

  private maybeRead(video: HTMLVideoElement, boxes: Detection[]) {
    const vehicleKinds = ['car', 'truck', 'bus', 'motorcycle'];
    const vehicleBoxes = boxes.filter(b => vehicleKinds.includes(b.kind) && b.score >= 0.40);

    if (vehicleBoxes.length === 0) {
      this.detectedVehicleBox.set(null);
      if (this.wasInGuide && !this.verified) {
        this.resetPlate();
      }
      return;
    }

    const target = vehicleBoxes.reduce((prev, curr) => (curr.w * curr.h > prev.w * prev.h ? curr : prev));
    this.detectedVehicleBox.set(target);
    this.wasInGuide = true;

    const now = performance.now();
    if (this.verified || this.request || now - this.lastRead < 2200) return;

    const vx = target.x * video.videoWidth;
    const vy = target.y * video.videoHeight;
    const vw = target.w * video.videoWidth;
    const vh = target.h * video.videoHeight;

    if (vw < 60 || vh < 30) return;

    this.lastRead = now;
    this.attempts++;

    const cropX = Math.max(0, vx + vw * 0.05);
    const cropY = Math.max(0, vy + vh * 0.25);
    const cropW = Math.min(video.videoWidth - cropX, vw * 0.90);
    const cropH = Math.min(video.videoHeight - cropY, vh * 0.75);

    const scale = Math.min(640 / Math.max(cropW, 1), 360 / Math.max(cropH, 1), 1.0);
    const finalW = Math.floor(Math.max(120, Math.min(640, cropW * scale)));
    const finalH = Math.floor(Math.max(48, Math.min(360, cropH * scale)));

    const crop = document.createElement('canvas');
    crop.width = finalW;
    crop.height = finalH;
    crop.getContext('2d')!.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);

    const run = this.requestEpoch;
    this.plateState.set('Leyendo matrícula...');
    crop.toBlob(blob => {
      if (run !== this.requestEpoch) return;
      if (!blob) { this.plateState.set('Error al preparar recorte'); return; }
      const form = new FormData();
      form.append('image', blob, 'placa.jpg');
      const options = { context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true) };
      this.request = this.api.post<FormData, {plate: string | null}>('/paquete3/cu32/plate/read/', form, options, 15_000)
        .subscribe({
          next: ({ plate }) => {
            this.request = undefined;
            if (plate) {
              this.verified = true;
              this.plate.set(plate);
              this.plateState.set(`Matrícula detectada: ${plate}`);
              this.log('plate', `Matrícula detectada: ${plate}`);
              this.request = this.api.post<{plate: string}, {registered: boolean; vehicle: Vehicle | null}>(
                '/paquete3/cu32/plate/lookup/', { plate }, options).subscribe({
                  next: result => {
                    this.vehicle.set(result.vehicle);
                    this.plateState.set(result.registered ? 'Vehículo registrado' : 'Vehículo no registrado');
                    this.log('lookup', result.registered ? 'Vehículo registrado en condominio' : 'Vehículo no registrado');
                  },
                  error: () => this.plateState.set('Error al consultar registro'),
                });
            } else {
              this.plateState.set('Vehículo en cuadro · Buscando matrícula...');
            }
          },
          error: () => {
            this.request = undefined;
            this.consensus.reset();
            this.plateState.set('Error de lectura');
          },
        });
    }, 'image/jpeg', .85);
  }
}
