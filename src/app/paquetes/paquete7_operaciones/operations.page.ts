import { DatePipe, KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { Analysis, Listing, OperationsApi, OperationsRecord, RecordInput } from './operations-api';
import { CHECKS, CONDITIONS, Kind, SPECS } from './operations-config';

@Component({
  imports: [FormsModule, DatePipe, KeyValuePipe, RouterLink, IconComponent],
  templateUrl: './operations.page.html',
  styleUrl: './operations.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsPage {
  private readonly api = inject(OperationsApi);
  readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as Kind;
  readonly spec = SPECS[this.kind];
  readonly checks = CHECKS;
  readonly conditions = CONDITIONS;
  readonly entries = signal<Listing | null>(null);
  readonly editing = signal(false);
  readonly editingId = signal<number | undefined>(undefined);
  readonly selected = signal<OperationsRecord[]>([]);
  readonly activePreview = signal<OperationsRecord | null>(null);
  readonly analysis = signal<Analysis | null>(null);
  readonly pendingDelete = signal<OperationsRecord | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly analyzing = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  private listRequest?: Subscription;
  private writeRequest?: Subscription;
  private analysisRequest?: Subscription;
  form = this.newForm();
  search = '';
  filter = '';
  page = 1;

  readonly kpis = computed(() => {
    const list = this.entries()?.results ?? [];
    const total = this.entries()?.count ?? 0;

    if (this.kind === 'warranties') {
      const vigentes = list.filter(item => item.status === 'active' && !this.expired(item)).length;
      const enReclamo = list.filter(item => item.status === 'claimed').length;
      const vencidas = list.filter(item => this.expired(item)).length;
      return { total, vigentes, enReclamo, vencidas };
    }

    if (this.kind === 'quotes') {
      const codes = new Set(list.map(i => String(i.details['request_code'] || ''))).size;
      const preseleccionadas = list.filter(i => i.status === 'shortlisted').length;
      const recibidas = list.filter(i => i.status === 'received').length;
      return { total, solicitudes: codes, preseleccionadas, recibidas };
    }

    const conAtencion = list.filter(i => {
      const c = (i.details['checks'] as Record<string, string>) || {};
      return Object.values(c).some(val => val === 'attention');
    }).length;
    const revisadas = list.filter(i => i.status === 'reviewed' || i.status === 'closed').length;
    const borradores = list.filter(i => i.status === 'draft').length;
    return { total, conAtencion, revisadas, borradores };
  });

  constructor() {
    const auth = inject(AuthService);
    effect(() => {
      const tenant = auth.activeTenant()?.id;
      untracked(() => {
        this.cancelRequests();
        this.entries.set(null);
        this.editing.set(false);
        this.selected.set([]);
        this.activePreview.set(null);
        this.analysis.set(null);
        this.pendingDelete.set(null);
        this.notice.set('');
        this.error.set('');
        this.loading.set(false);
        this.saving.set(false);
        this.analyzing.set(false);
        this.search = '';
        this.filter = '';
        this.page = 1;
        if (tenant) this.reload();
      });
    });
    inject(DestroyRef).onDestroy(() => this.cancelRequests());
  }

  private cancelRequests() {
    this.listRequest?.unsubscribe();
    this.writeRequest?.unsubscribe();
    this.analysisRequest?.unsubscribe();
  }

  private newForm(): RecordInput {
    const details: RecordInput['details'] = {};
    for (const field of this.spec.fields) details[field.key] = field.options?.[0] ?? '';
    if (this.kind === 'inspections') details['checks'] = Object.fromEntries(CHECKS.map(([key]) => [key, 'not_checked']));
    return { title: '', date: '', status: Object.keys(this.spec.states)[0], details };
  }

  get inspectionChecks() { return this.form.details['checks'] as Record<string, string>; }

  reload(page = 1) {
    this.listRequest?.unsubscribe();
    this.page = page;
    this.loading.set(true);
    this.listRequest = this.api.list(this.kind, page, this.search.trim(), this.filter).subscribe({
      next: list => {
        this.entries.set(list);
        this.loading.set(false);
        if (list.results.length > 0 && !this.activePreview()) {
          this.activePreview.set(list.results[0]);
        }
      },
      error: err => { this.error.set(this.message(err)); this.loading.set(false); },
    });
  }

  edit(item?: OperationsRecord) {
    this.form = item ? structuredClone({ title: item.title, date: item.date, status: item.status, details: item.details }) : this.newForm();
    this.editingId.set(item?.id);
    this.error.set('');
    this.editing.set(true);
  }

  save() {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.writeRequest = this.api.save(this.kind, this.form, this.editingId()).subscribe({
      next: saved => {
        this.activePreview.set(saved);
        this.changed('Registro guardado.');
      },
      error: err => { this.error.set(this.message(err)); this.saving.set(false); },
    });
  }

  remove() {
    const item = this.pendingDelete();
    if (!item || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.writeRequest = this.api.remove(this.kind, item.id).subscribe({
      next: () => {
        if (this.activePreview()?.id === item.id) this.activePreview.set(null);
        this.changed('Registro eliminado.');
      },
      error: err => { this.error.set(this.message(err)); this.saving.set(false); },
    });
  }

  private changed(message: string) {
    this.saving.set(false);
    this.editing.set(false);
    this.pendingDelete.set(null);
    this.analysisRequest?.unsubscribe();
    this.analyzing.set(false);
    this.selected.set([]);
    this.analysis.set(null);
    this.notice.set(message);
    this.reload();
  }

  showPreview(item: OperationsRecord) {
    this.activePreview.set(item);
  }

  picked(id: number) { return this.selected().some(item => item.id === id); }

  select(item: OperationsRecord, checked: boolean) {
    if (this.analyzing()) return;
    this.error.set('');
    if (checked && this.kind === 'quotes') {
      const first = this.selected()[0];
      if (first && (first.details['request_code'] !== item.details['request_code'] ||
          first.details['currency'] !== item.details['currency'])) {
        this.error.set('Selecciona cotizaciones de la misma solicitud y moneda.');
        return;
      }
    }
    this.analysis.set(null);
    if (!checked) this.selected.update(items => items.filter(row => row.id !== item.id));
    else if (this.kind === 'inspections') this.selected.set([item]);
    else if (this.selected().length < 5) this.selected.update(items => [...items, item]);
  }

  analyze() {
    if (this.analyzing() || this.selected().length < (this.kind === 'quotes' ? 2 : 1)) return;
    this.analyzing.set(true);
    this.analysis.set(null);
    this.error.set('');
    this.analysisRequest = this.api.analyze(this.kind, this.selected().map(item => item.id)).subscribe({
      next: result => { this.analysis.set(result); this.analyzing.set(false); },
      error: err => { this.error.set(this.message(err)); this.analyzing.set(false); },
    });
  }

  label(item: OperationsRecord) {
    const d = item.details;
    if (this.kind === 'quotes') return `${d['request_code']} · ${d['provider']} · ${d['amount']} ${d['currency']}`;
    if (this.kind === 'warranties') return `${d['reference']} · ${d['provider']}`;
    return String(d['location']);
  }

  expired(item: OperationsRecord) {
    if (this.kind === 'inspections' || item.status === 'closed' || item.status === 'discarded') return false;
    const today = new Date();
    const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')].join('-');
    return item.date < localDate;
  }

  statusColor(item: OperationsRecord): string {
    if (this.expired(item)) return 'badge-danger';
    if (item.status === 'active' || item.status === 'shortlisted' || item.status === 'reviewed') return 'badge-success';
    if (item.status === 'claimed' || item.status === 'closed') return 'badge-warning';
    return 'badge-neutral';
  }

  checkBadge(status: string): { label: string; cls: string } {
    if (status === 'ok') return { label: 'Conforme', cls: 'check-ok' };
    if (status === 'attention') return { label: 'Requiere atención', cls: 'check-attention' };
    return { label: 'Sin revisar', cls: 'check-pending' };
  }

  getCheckStatus(item: OperationsRecord, checkKey: string): string {
    const checks = item.details['checks'];
    if (checks && typeof checks === 'object' && !Array.isArray(checks)) {
      return (checks as Record<string, string>)[checkKey] || 'not_checked';
    }
    return 'not_checked';
  }

  private message(err: unknown) {
    if (!(err instanceof HttpErrorResponse)) return 'La solicitud tardó demasiado. Intenta de nuevo.';
    if (err.status === 429) return 'Se alcanzó el límite de análisis. Espera un minuto.';
    if (err.status === 0) return 'No hay conexión con Taji. Intenta de nuevo.';
    const body = err.error;
    const leaf = this.firstError(body?.error?.fields);
    return leaf ?? body?.detail ?? body?.error?.message ?? 'No se pudo completar la solicitud.';
  }

  private firstError(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return undefined;
    for (const item of Object.values(value)) {
      const message = this.firstError(item);
      if (message) return message;
    }
    return undefined;
  }
}
