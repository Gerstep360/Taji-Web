import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ReportsApi } from './reportes.api';
import { ReportCatalog, ReportColumn, ReportFilter, ReportPreview, ReportRequest, ReportSort } from './reportes.models';

@Component({
  selector: 'taji-reportes-page',
  imports: [FormsModule, IconComponent],
  templateUrl: './reportes.page.html',
  styleUrl: './reportes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage implements OnInit {
  private readonly api = inject(ReportsApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly catalog = signal<ReportCatalog | null>(null);
  readonly sourceKey = signal('');
  readonly source = computed(() => this.catalog()?.sources.find(source => source.key === this.sourceKey()));
  readonly preview = signal<ReportPreview | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  columns: string[] = [];
  filters: ReportFilter[] = [];
  ordering: ReportSort[] = [];
  title = '';
  readonly operators: Record<string, string> = {
    contains: 'Contiene', eq: 'Es igual a', ne: 'Es distinto de', gte: 'Desde / mayor o igual',
    lte: 'Hasta / menor o igual', is_empty: 'Está vacío', not_empty: 'Tiene valor',
  };

  ngOnInit(): void {
    this.busy.set(true);
    this.api.catalog().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: catalog => { this.catalog.set(catalog); this.selectSource(catalog.sources[0]?.key ?? ''); },
      error: err => this.showError(err, 'No se pudo cargar el catálogo de reportes.'),
    });
  }

  selectSource(key: string): void {
    this.sourceKey.set(key);
    this.columns = [...(this.source()?.default_columns ?? [])];
    this.ordering = (this.source()?.default_ordering ?? []).map(item => ({ ...item }));
    this.filters = [];
    this.title = this.source()?.label ?? '';
    this.changed();
  }
  changed(): void { this.preview.set(null); this.error.set(''); this.notice.set(''); }
  column(key: string): ReportColumn | undefined { return this.source()?.columns.find(column => column.key === key); }
  toggleColumn(key: string): void {
    this.columns = this.columns.includes(key) ? this.columns.filter(value => value !== key) : [...this.columns, key];
    this.changed();
  }
  moveColumn(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.columns.length) return;
    [this.columns[index], this.columns[target]] = [this.columns[target], this.columns[index]];
    this.changed();
  }
  addFilter(): void {
    const column = this.source()?.columns[0];
    if (!column || this.filters.length >= 10) return;
    this.filters.push({ field: column.key, operator: column.operators[0], value: '' });
    this.changed();
  }
  changeFilterField(filter: ReportFilter, key: string): void {
    filter.field = key;
    filter.operator = this.column(key)?.operators[0] ?? 'eq';
    filter.value = '';
    this.changed();
  }
  removeFilter(index: number): void { this.filters.splice(index, 1); this.changed(); }
  needsValue(filter: ReportFilter): boolean { return !['is_empty', 'not_empty'].includes(filter.operator); }
  addSort(): void {
    const next = this.source()?.columns.find(column => !this.ordering.some(item => item.field === column.key));
    if (!next || this.ordering.length >= 3) return;
    this.ordering.push({ field: next.key, direction: 'asc' });
    this.changed();
  }
  removeSort(index: number): void { this.ordering.splice(index, 1); this.changed(); }
  request(page = 1): ReportRequest {
    return { source: this.sourceKey(), title: this.title.trim(), columns: [...this.columns],
      filters: this.filters.map(item => ({ ...item, value: String(item.value ?? '').trim() })),
      ordering: this.ordering.map(item => ({ ...item })), page, page_size: 25 };
  }
  private valid(): boolean {
    let message = '';
    if (!this.source() || !this.columns.length) message = 'Selecciona al menos una columna.';
    else if (this.filters.some(item => this.needsValue(item) && !String(item.value ?? '').trim())) message = 'Completa los valores de todos los filtros.';
    else if (new Set(this.ordering.map(item => item.field)).size !== this.ordering.length) message = 'No repitas columnas en los criterios de orden.';
    this.error.set(message);
    return !message;
  }
  generate(page = 1): void {
    if (this.busy() || !this.valid()) return;
    this.preview.set(null);
    this.notice.set('');
    this.busy.set(true);
    this.api.preview(this.request(page)).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: preview => this.preview.set(preview),
      error: err => this.showError(err, 'No se pudo generar la vista previa.'),
    });
  }
  download(format: 'xlsx' | 'html'): void {
    if (this.busy() || !this.preview()?.can_export || !this.valid()) return;
    this.busy.set(true);
    this.notice.set('');
    this.api.export(this.request(), format).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-${this.sourceKey()}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.notice.set('Descarga generada con todas las filas que cumplen los filtros, no solo esta página.');
      },
      error: err => this.showError(err, 'No se pudo exportar el reporte.'),
    });
  }
  private showError(err: any, fallback: string): void {
    if (err?.error instanceof Blob) {
      void err.error.text().then((text: string) => {
        try { this.error.set(this.message(JSON.parse(text), fallback)); }
        catch { this.error.set(fallback); }
      }).catch(() => this.error.set(fallback));
    } else this.error.set(this.message(err?.error, fallback));
  }
  private message(data: any, fallback: string): string {
    const fields = data?.error?.fields;
    if (fields && typeof fields === 'object') {
      const details = Object.values(fields).flat().filter(value => typeof value === 'string');
      if (details.length) return details.join(' ');
    }
    const message = data?.error?.message ?? data?.detail ?? data?.non_field_errors?.[0];
    return typeof message === 'string' ? message : fallback;
  }
}
