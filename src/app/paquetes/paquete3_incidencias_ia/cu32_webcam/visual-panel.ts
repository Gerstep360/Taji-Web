import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Observation, Review, VisionConfig, VisionMode, VisualApi } from './visual-api';
import { canRecordMp4, capture, Frame, SceneSampler } from './visual-capture';
import { SceneTrigger } from './visual-trigger';

@Component({
  selector: 'app-visual-panel',
  imports: [DatePipe, RouterLink],
  templateUrl: './visual-panel.html',
  styleUrl: './visual-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualPanel {
  readonly video = input.required<HTMLVideoElement>();
  readonly cameraActive = input(false);
  private readonly api = inject(VisualApi);
  private readonly auth = inject(AuthService);
  readonly expanded = signal(false);
  readonly config = signal<VisionConfig | null>(null);
  readonly session = signal<string | null>(null);
  readonly state = signal('Pausado');
  readonly actionError = signal('');
  readonly starting = signal(false);
  readonly items = signal<Observation[]>([]);
  readonly more = signal(false);
  readonly historyBusy = signal(false);
  readonly historyError = signal('');
  readonly selected = signal<Observation | null>(null);
  readonly evidence = signal('');
  readonly reviewBusy = signal(false);
  readonly detailBusy = signal(false);
  readonly detailError = signal('');
  readonly reviewNote = signal('');
  readonly reviewChoice = signal<Exclude<Review, 'pending'>>('confirmed');
  readonly reviewLabels: Record<Review, string> = {
    pending: 'Pendiente', confirmed: 'Confirmada', corrected: 'Corregida', dismissed: 'Descartada', proposed: 'Propuesta',
  };
  readonly reviewOptions = Object.keys(this.reviewLabels) as Review[];
  readonly mode = computed<VisionMode | null>(() => {
    const modes = this.config()?.modes ?? [];
    return modes.includes('video') && canRecordMp4() ? 'video' : modes.includes('image') ? 'image' : null;
  });
  private epoch = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private captureAbort?: AbortController;
  private request?: Subscription;
  private historyRequest?: Subscription;
  private detailRequest?: Subscription;
  private settingsRequest?: Subscription;
  private evidenceRequest?: Subscription;
  private reviewRequest?: Subscription;
  private expires = 0;
  private nextAt = 0;
  private failures = 0;
  private monitor?: ReturnType<typeof setInterval>;
  private sampler?: SceneSampler;
  private trigger?: SceneTrigger;
  private lastScan = 0;
  private busy = false;
  private filters: Record<string, string> = {};
  private page = 0;

  constructor() {
    let tenant = this.auth.activeTenant()?.id;
    effect(() => {
      const next = this.auth.activeTenant()?.id;
      if (tenant !== next) untracked(() => {
        this.stop();
        this.clearHistory();
        if (this.expanded()) this.refreshConfig();
      });
      tenant = next;
    });
    inject(DestroyRef).onDestroy(() => { this.stop(); this.clearHistory(); });
  }

  private clearHistory() {
    this.settingsRequest?.unsubscribe();
    this.historyRequest?.unsubscribe();
    this.closeDetail();
    this.items.set([]); this.more.set(false); this.config.set(null);
    this.historyBusy.set(false); this.historyError.set('');
    this.page = 0; this.filters = {};
  }

  toggle() {
    if (this.expanded()) { this.expanded.set(false); this.stop(); this.clearHistory(); return; }
    this.expanded.set(true);
    this.refreshConfig();
    this.loadHistory();
  }

  refreshConfig() {
    this.settingsRequest?.unsubscribe();
    this.actionError.set('');
    this.settingsRequest = this.api.settings().subscribe({
      next: config => this.config.set(config),
      error: () => this.actionError.set('No se pudo consultar la visión. La detección local sigue disponible.'),
    });
  }

  start(sector: string, evidence: boolean) {
    if (this.starting() || this.session() || !this.cameraActive() || !this.mode() || document.hidden) return;
    const run = ++this.epoch;
    this.starting.set(true); this.actionError.set('');
    // Let a start request finish so a session created while leaving can still be closed by ID.
    this.api.start(sector ? Number(sector) : null, evidence).subscribe({
      next: session => {
        if (!this.valid(run)) { this.closeRemote(session.id); return; }
        this.starting.set(false); this.session.set(session.id);
        this.expires = Date.parse(session.expires_at); this.failures = 0;
        this.startMonitor(run);
      },
      error: (error: unknown) => {
        if (run !== this.epoch) return;
        this.starting.set(false); this.actionError.set(this.message(error));
      },
    });
  }

  stop(label = 'Pausado') {
    ++this.epoch;
    clearTimeout(this.timer);
    clearInterval(this.monitor);
    this.sampler?.clear(); this.sampler = undefined; this.trigger = undefined;
    this.busy = false;
    this.request?.unsubscribe();
    this.captureAbort?.abort();
    this.starting.set(false);
    this.actionError.set('');
    this.state.set(label);
    const id = this.session();
    this.session.set(null);
    if (id) this.closeRemote(id);
  }

  private closeRemote(id: string) { this.api.stop(id).subscribe({ error: () => undefined }); }
  private valid(run: number) { return run === this.epoch && this.cameraActive() && !document.hidden; }
  private schedule(fn: () => void, ms: number) { clearTimeout(this.timer); this.timer = setTimeout(fn, ms); }

  private startMonitor(run: number) {
    const config = this.config(), mode = this.mode();
    if (!config || !mode) return;
    this.nextAt = 0;
    this.lastScan = -Infinity;
    try { this.sampler = new SceneSampler(this.video(), mode); }
    catch { this.stop('No se pudo preparar la captura'); return; }
    this.trigger = new SceneTrigger(config.interval * 1000, config.periodic * 1000, config.idle * 1000);
    const tick = () => {
      if (!this.valid(run) || !this.sampler || !this.trigger) return;
      if (Date.now() >= this.expires) { this.stop('La sesión terminó'); return; }
      const now = performance.now(), scan = now - this.lastScan >= 650;
      try {
        const signature = this.sampler.sample(now, scan);
        if (!signature) return;
        this.lastScan = now;
        if (this.busy || Date.now() < this.nextAt) return;
        const cause = this.trigger.inspect(signature, now);
        if (!cause) { this.state.set('Monitoreo local · esperando cambios o revisión general'); return; }
        const frames = mode === 'video' ? this.sampler.window() : null;
        if (mode === 'video' && !frames) { this.state.set('Preparando búfer local…'); return; }
        this.trigger.sent(signature, now);
        void this.send(run, cause, frames ?? undefined);
      } catch { this.stop('No se pudo leer la imagen de la cámara'); }
    };
    this.monitor = setInterval(tick, mode === 'video' ? 250 : 700);
    tick();
  }

  private async send(run: number, cause: 'initial' | 'change' | 'periodic', frames?: Frame[]) {
    const id = this.session(), mode = this.mode();
    if (!id || !mode || !this.valid(run)) return;
    if (Date.now() >= this.expires) { this.stop('La sesión terminó'); return; }
    this.busy = true;
    const abort = this.captureAbort = new AbortController();
    const capturedAt = frames?.at(-1)?.at ?? performance.now();
    this.state.set(cause === 'change' ? 'Cambio visual · preparando evidencia…' : 'Preparando revisión general…');
    this.actionError.set('');
    try {
      const blob = await capture(this.video(), mode, abort.signal, frames);
      if (!this.valid(run)) return;
      const config = this.config()!;
      if (blob.size > (mode === 'video' ? config.video_max_bytes : config.image_max_bytes)) {
        this.stop('Captura demasiado grande'); return;
      }
      this.nextAt = Date.now() + config.interval * 1000 + 500;
      this.state.set('Enviando captura…');
      this.request = this.api.upload(id, mode, blob, Math.max(0, Math.round(performance.now() - capturedAt))).subscribe({
        next: job => this.poll(run, job, Date.now()),
        error: error => this.retry(run, error),
      });
    } catch {
      if (this.valid(run)) this.stop('No se pudo preparar la captura');
    }
  }

  private poll(run: number, job: Observation, since: number) {
    if (!this.valid(run)) return;
    if (job.status === 'queued' || job.status === 'running') {
      const elapsed = Date.now() - since;
      if (elapsed > 90_000) { this.stop('Sin respuesta. Puedes reactivar el análisis.'); return; }
      this.state.set(job.status === 'queued' ? 'En espera del trabajador…' :
        elapsed > 14_000 ? 'NVIDIA tarda más de lo habitual…' : 'NVIDIA está analizando…');
      this.schedule(() => {
        if (!this.valid(run)) return;
        this.request = this.api.detail(job.id).subscribe({
          next: item => this.poll(run, item, since), error: error => this.retry(run, error),
        });
      }, 3200);
      return;
    }
    if (job.status === 'failed') { this.retry(run, null, job.provider_status); return; }
    if (job.status === 'cancelled') { this.stop('La sesión terminó'); return; }
    this.failures = 0;
    this.busy = false;
    this.state.set(job.status === 'succeeded' ? 'Observación guardada · en pausa entre capturas' : 'Sin novedad · en pausa entre capturas');
    if (job.status === 'succeeded') this.loadHistory(this.filters);
  }

  private retry(run: number, error: unknown, code?: string) {
    if (!this.valid(run)) return;
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if ([400, 401, 403, 404].includes(status) || code === 'access_revoked' || ++this.failures >= 3) {
      this.stop(this.message(error, code)); return;
    }
    this.state.set(this.message(error, code));
    const retry = error instanceof HttpErrorResponse ? Number(error.headers.get('Retry-After')) : 0;
    this.nextAt = Math.max(this.nextAt, Date.now() + Math.max(40_000, (retry || (status === 429 ? 60 : 0)) * 1000));
    this.busy = false;
  }

  private message(error: unknown, code?: string) {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 429 || code === 'http_429') return 'Presupuesto alcanzado · pausa temporal';
    if (status === 400) return 'Captura o sector inválido. Revisa la configuración.';
    if (status === 403 || code === 'access_revoked') return 'Tu cuenta ya no tiene permiso para analizar.';
    if (status === 409) return 'La sesión terminó o aún tiene un análisis en curso.';
    if (code === 'timeout') return 'NVIDIA superó el tiempo de espera. La cámara local sigue activa.';
    if (code === 'invalid_response') return 'NVIDIA no entregó una observación verificable.';
    return 'Análisis no disponible. La cámara local sigue activa.';
  }

  filter(query: string, sector: string, review: string, since: string, until: string, relevance: string, openRelated: boolean) {
    const filters: Record<string, string> = {};
    if (query.trim()) filters['q'] = query.trim();
    if (sector) filters['sector'] = sector;
    if (review) filters['review'] = review;
    if (relevance) filters['relevance'] = relevance;
    if (openRelated) filters['open_related'] = 'true';
    if (since) filters['since'] = new Date(since + 'T00:00:00').toISOString();
    if (until) filters['until'] = new Date(until + 'T23:59:59.999').toISOString();
    this.loadHistory(filters);
  }

  loadHistory(filters: Record<string, string> = this.filters, append = false) {
    this.historyRequest?.unsubscribe();
    this.historyBusy.set(true); this.historyError.set(''); this.filters = filters;
    const page = append ? this.page + 1 : 1;
    this.historyRequest = this.api.history({ ...filters, page: String(page) }).subscribe({
      next: result => {
        this.page = page;
        this.items.set(append ? [...this.items(), ...result.results] : result.results);
        this.more.set(!!result.next); this.historyBusy.set(false);
      },
      error: () => { this.historyBusy.set(false); this.historyError.set('No se pudo cargar el historial.'); },
    });
  }

  open(item: Observation) {
    this.closeDetail();
    this.selected.set(item);
    this.detailBusy.set(true);
    this.detailRequest = this.api.detail(item.id).subscribe({
      next: detail => { this.selected.set(detail); this.detailBusy.set(false); },
      error: () => { this.detailBusy.set(false); this.detailError.set('No se pudo cargar el detalle.'); },
    });
  }

  closeDetail() {
    this.detailRequest?.unsubscribe(); this.evidenceRequest?.unsubscribe(); this.reviewRequest?.unsubscribe();
    if (this.evidence()) URL.revokeObjectURL(this.evidence());
    this.evidence.set(''); this.selected.set(null); this.reviewBusy.set(false); this.detailBusy.set(false);
    this.detailError.set(''); this.reviewNote.set(''); this.reviewChoice.set('confirmed');
  }

  showEvidence(item: Observation) {
    this.evidenceRequest?.unsubscribe();
    this.evidenceRequest = this.api.evidence(item.id).subscribe({
      next: blob => {
        if (this.evidence()) URL.revokeObjectURL(this.evidence());
        this.evidence.set(URL.createObjectURL(blob));
      },
      error: () => this.detailError.set('La evidencia ya no está disponible.'),
    });
  }

  saveReview(item: Observation) {
    const decision = this.reviewChoice(), note = this.reviewNote().trim();
    if (decision !== 'confirmed' && !note) { this.detailError.set('Escribe el motivo o la corrección.'); return; }
    this.reviewBusy.set(true); this.detailError.set('');
    this.reviewRequest = this.api.review(item.id, decision, note).subscribe({
      next: detail => { this.selected.set(detail); this.reviewBusy.set(false); this.reviewNote.set(''); this.loadHistory(); },
      error: () => { this.reviewBusy.set(false); this.detailError.set('No se pudo guardar la revisión.'); },
    });
  }
}
