import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ReportsApi } from './reports.api';
import { ReportVoiceService } from './report-voice.service';
import {
  emptyOperator,
  OPERATOR_LABELS,
  ReportCatalog,
  ReportColumn,
  ReportFilter,
  ReportPreview,
  ReportRequest,
  ReportSource,
} from './reports.models';

@Component({
  selector: 'taji-reports',
  imports: [FormsModule, IconComponent],
  providers: [ReportVoiceService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
})
export class ReportsPage {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly api = inject(ReportsApi);
  readonly voice = inject(ReportVoiceService);
  private readonly auth = inject(AuthService);
  readonly catalog = signal<ReportCatalog | null>(null);
  readonly result = signal<ReportPreview | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly listening = signal(false);
  readonly preparingMicrophone = signal(false);
  readonly operators = OPERATOR_LABELS;
  readonly emptyOperator = emptyOperator;
  source: ReportSource | null = null;
  columns: string[] = [];
  filters: ReportFilter[] = [];
  title = '';
  orderField = '';
  direction: 'asc' | 'desc' = 'asc';
  text = '';
  format = 'xlsx';
  pageSize = 25;
  summary = '';
  private query: ReportRequest | null = null;
  private revision = 0;
  constructor() {
    effect(() => {
      this.auth.user()?.active_tenant?.id;
      void this.load();
    });
    inject(DestroyRef).onDestroy(() => {
      this.revision++;
      this.voice.stop();
      this.voice.stopSpeaking();
    });
  }
  async load() {
    const version = ++this.revision;
    this.voice.stop();
    this.voice.stopSpeaking();
    this.listening.set(false);
    this.result.set(null);
    this.query = null;
    this.catalog.set(null);
    this.source = null;
    this.text = '';
    this.filters = [];
    this.columns = [];
    this.title = '';
    this.summary = '';
    this.error.set('');
    this.notice.set('');
    this.busy.set(false);
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.api.catalog());
      if (version !== this.revision) return;
      this.catalog.set(data);
      this.format = data.formats.includes('xlsx') ? 'xlsx' : data.formats[0];
      if (data.sources[0]) this.selectSource(data.sources[0].key);
    } catch (e) {
      if (version === this.revision) await this.failure(e);
    } finally {
      if (version === this.revision) this.loading.set(false);
    }
  }
  selectSource(key: string) {
    this.source = this.catalog()?.sources.find((s) => s.key === key) || null;
    this.columns = [...(this.source?.default_columns || [])];
    this.filters = [];
    this.title = '';
    this.orderField = this.source?.default_ordering[0]?.field || this.source?.columns[0]?.key || '';
    this.direction = this.source?.default_ordering[0]?.direction || 'asc';
    this.changed();
  }
  changed() {
    this.result.set(null);
    this.query = null;
    this.summary = '';
    this.notice.set('');
    this.voice.stopSpeaking();
  }
  toggleColumn(key: string) {
    this.columns = this.columns.includes(key)
      ? this.columns.filter((c) => c !== key)
      : [...this.columns, key];
    this.changed();
  }
  addFilter() {
    const col = this.source?.columns[0];
    if (col && this.filters.length < 8) {
      this.filters = [...this.filters, { field: col.key, operator: col.operators[0], value: '' }];
      this.changed();
    }
  }
  filterColumn(filter: ReportFilter): ReportColumn | undefined {
    return this.source?.columns.find((c) => c.key === filter.field);
  }
  setFilterField(filter: ReportFilter) {
    const col = this.filterColumn(filter);
    filter.operator = col?.operators[0] || 'eq';
    filter.value = '';
    this.changed();
  }
  removeFilter(index: number) {
    this.filters = this.filters.filter((_, i) => i !== index);
    this.changed();
  }
  private draft(): ReportRequest {
    return {
      source: this.source!.key,
      title: this.title.trim(),
      columns: [...this.columns],
      filters: this.filters.map((f) => ({
        ...f,
        value: emptyOperator(f.operator) ? '' : f.value.trim(),
      })),
      ordering: [{ field: this.orderField, direction: this.direction }],
      page: 1,
      page_size: Number(this.pageSize),
    };
  }
  valid() {
    return (
      !!this.source &&
      this.columns.length > 0 &&
      this.filters.every((f) => emptyOperator(f.operator) || f.value.trim().length > 0)
    );
  }
  async preview(page = 1) {
    if (this.busy() || !this.valid()) return;
    const request = page === 1 ? this.draft() : { ...this.query!, page };
    await this.perform(async (current) => {
      const result = await firstValueFrom(this.api.preview(request));
      if (!current()) return;
      this.result.set(result);
      this.query = request;
      this.summary = '';
    });
  }
  async ask() {
    if (this.busy() || !this.text.trim()) return;
    this.voice.stop();
    this.listening.set(false);
    await this.perform(async (current) => {
      const response = await firstValueFrom(this.api.voice(this.text.trim()));
      if (!current()) return;
      const source = this.catalog()?.sources.find((s) => s.key === response.report_preview.source);
      if (!source) throw new Error('El servidor devolvió una fuente no disponible.');
      this.selectSource(source.key);
      const request = response.report_request || {
        source: source.key,
        title: response.report_preview.title,
        columns: response.report_preview.columns.map((c) => c.key),
        filters: response.understood_intent.detected_filters,
        ordering: source.default_ordering,
        page: 1,
        page_size: 25,
      };
      this.columns = [...request.columns];
      this.filters = request.filters.map((f) => ({ ...f }));
      this.title = request.title;
      this.orderField = request.ordering[0]?.field || source.columns[0].key;
      this.direction = request.ordering[0]?.direction || 'asc';
      this.pageSize = request.page_size;
      if (this.catalog()?.formats.includes(response.understood_intent.detected_format))
        this.format = response.understood_intent.detected_format;
      this.result.set(response.report_preview);
      this.query = structuredClone(request);
      this.summary = response.spoken_summary;
      this.notice.set('Consulta interpretada. Revisa la fuente y los filtros antes de exportar.');
    });
  }
  async microphones() {
    try {
      await this.voice.loadMicrophones();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo acceder al micrófono.');
    }
  }
  async dictate() {
    if (this.listening()) {
      await this.transcribeRecording();
      return;
    }
    if (this.busy() || this.preparingMicrophone()) return;
    this.error.set('');
    const version = this.revision;
    this.preparingMicrophone.set(true);
    try {
      const started = await this.voice.begin(() =>
        this.notice.set(
          'Grabación pausada a los 30 segundos. Pulsa Transcribir para enviarla o descártala.',
        ),
      );
      if (version === this.revision) this.listening.set(started);
    } catch (error) {
      if (version === this.revision) await this.failure(error);
    } finally {
      this.preparingMicrophone.set(false);
    }
  }
  cancelRecording() {
    this.voice.stop();
    this.listening.set(false);
    this.notice.set('Grabación descartada. No se envió audio.');
  }
  private async transcribeRecording() {
    if (this.busy() || !this.listening()) return;
    this.listening.set(false);
    await this.perform(async (current) => {
      const audio = await this.voice.finish();
      if (!current()) return;
      const response = await firstValueFrom(this.api.transcribe(audio));
      if (!current()) return;
      this.text = response.text;
      this.changeDetector.markForCheck();
      this.notice.set('Audio transcrito. Revisa el texto y pulsa Consultar cuando esté correcto.');
    });
  }
  async read() {
    const result = this.result();
    if (!result || this.busy()) return;
    await this.perform(async (current) => {
      const data = await firstValueFrom(this.api.narrate(result.source, result.pagination.total));
      if (!current()) return;
      this.summary = data.spoken_summary;
      this.voice.speak(this.summary);
    });
  }
  async download() {
    const query = this.query;
    if (!query || !this.result()?.can_export || this.busy()) return;
    await this.perform(async (current) => {
      const blob = await firstValueFrom(this.api.export(query, this.format));
      if (!current()) return;
      if (!blob.size) throw new Error('El archivo llegó vacío. Intenta exportar nuevamente.');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `reporte-${query.source.replace(/[^a-z0-9_-]/gi, '')}.${this.format}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notice.set('Reporte preparado para descargar.');
    });
  }
  private async perform(action: (current: () => boolean) => Promise<void>) {
    this.busy.set(true);
    this.error.set('');
    const version = this.revision;
    try {
      await action(() => version === this.revision);
    } catch (e) {
      if (version === this.revision) await this.failure(e);
    } finally {
      if (version === this.revision) this.busy.set(false);
    }
  }
  private async failure(error: unknown) {
    const version = this.revision;
    const e = error as { error?: unknown; status?: number; message?: string };
    let data = e.error as { error?: { message?: string }; detail?: string } | undefined;
    if (e.error instanceof Blob) {
      try {
        data = JSON.parse(await e.error.text());
      } catch {
        data = undefined;
      }
    }
    if (version !== this.revision) return;
    this.error.set(
      data?.error?.message ||
        data?.detail ||
        (e.status === 403
          ? 'No tienes acceso a reportes en este condominio.'
          : e.status === 0
            ? 'No se pudo conectar con el servidor. Tus filtros se conservan.'
            : error instanceof Error && !e.status
              ? e.message || 'No se pudo completar la consulta.'
              : 'No se pudo completar la consulta. Conservamos tu configuración; intenta nuevamente.'),
    );
  }
}
