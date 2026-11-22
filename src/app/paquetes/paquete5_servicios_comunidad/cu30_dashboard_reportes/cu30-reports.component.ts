import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { Cu30ReportsApi, ReportCatalog, ReportFilter, ReportOrder, ReportPreview, ReportQuery } from './cu30-reports.api';
import { DASHBOARD_ROLES, DashboardDates } from './operational-dashboard.api';

type Job = 'catalog' | 'preview' | 'export';
const FORMAT_LABELS: Record<string, string> = { xlsx: 'Excel', csv: 'CSV', html: 'HTML', pdf: 'PDF' };
const OPERATOR_LABELS: Record<string, string> = {
  eq: 'Es igual a', ne: 'Es distinto de', contains: 'Contiene', gte: 'Desde', lte: 'Hasta',
  is_empty: 'Está vacío', not_empty: 'No está vacío',
};

@Component({
  selector: 'taji-cu30-reports',
  imports: [IconComponent],
  templateUrl: './cu30-reports.component.html',
  styleUrl: './cu30-reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cu30ReportsComponent {
  readonly contextKey = input.required<string>();
  readonly initialDates = input<Partial<DashboardDates>>({});
  private readonly auth = inject(AuthService);
  private readonly api = inject(Cu30ReportsApi);
  private readonly destroyRef = inject(DestroyRef);
  private pending?: Subscription;
  private generation = 0;

  readonly currentTenant = computed(() => {
    const user = this.auth.user();
    const tenant = this.auth.activeTenant();
    if (!user || !tenant || this.contextKey() !== `${user.id}:${tenant.id}`) return null;
    return user.is_superuser || DASHBOARD_ROLES.includes(user.role?.slug.toLowerCase() ?? '') ? tenant.id : null;
  });
  readonly catalog = signal<ReportCatalog | null>(null);
  readonly sourceKey = signal('');
  readonly source = computed(() => this.catalog()?.sources.find((item) => item.key === this.sourceKey()));
  readonly columns = signal<string[]>([]);
  readonly filters = signal<ReportFilter[]>([]);
  readonly ordering = signal<ReportOrder[]>([]);
  readonly dates = signal<DashboardDates>({ date_from: '', date_to: '' });
  readonly pageSize = signal(25);
  readonly error = signal('');
  readonly busy = signal<Job | null>(null);
  readonly downloaded = signal(false);
  readonly result = signal<ReportPreview | null>(null);
  private applied?: ReportQuery;
  readonly formats = computed(() => {
    const catalog = this.catalog();
    return this.source()?.formats.filter((format) =>
      catalog?.formats.includes(format) && Object.hasOwn(FORMAT_LABELS, format)
    ) ?? [];
  });

  constructor() {
    effect(() => {
      const tenant = this.currentTenant();
      untracked(() => {
        this.clear();
        if (tenant !== null) {
          const dates = this.initialDates();
          this.dates.set({ date_from: dates.date_from ?? '', date_to: dates.date_to ?? '' });
          this.reloadCatalog();
        }
      });
    });
    this.destroyRef.onDestroy(() => this.cancel());
  }

  reloadCatalog() {
    const tenant = this.currentTenant();
    if (tenant === null) return;
    this.clear();
    this.run('catalog', this.api.catalog(tenant), (catalog) => {
      if (catalog.context.mode !== 'condominium' || catalog.context.id !== tenant) {
        this.error.set('El contexto operativo cambió. Vuelve a cargar las fuentes.');
        return;
      }
      this.catalog.set(catalog);
      this.selectSource(catalog.sources[0]?.key ?? '');
    });
  }

  selectSource(key: string) {
    this.invalidate();
    this.sourceKey.set(key);
    const source = this.source();
    this.columns.set(source?.default_columns.filter((key) => source.columns.some((column) => column.key === key)) ?? []);
    this.filters.set([]);
    this.ordering.set(source?.default_ordering.filter((item) => source.sortable.includes(item.field)) ?? []);
  }

  toggleColumn(key: string, checked: boolean) {
    this.invalidate();
    this.columns.update((columns) => checked ? [...new Set([...columns, key])] : columns.filter((column) => column !== key));
  }

  setDate(field: keyof DashboardDates, value: string) {
    this.invalidate();
    this.dates.update((dates) => ({ ...dates, [field]: value }));
  }

  setPageSize(value: string) {
    this.invalidate();
    this.pageSize.set(Number(value));
  }

  addFilter() {
    const column = this.source()?.columns.find((item) => item.operators.length);
    if (!column || this.filters().length >= 10) return;
    this.invalidate();
    this.filters.update((filters) => [...filters, { field: column.key, operator: column.operators[0], value: '' }]);
  }

  editFilter(index: number, field: keyof ReportFilter, value: string) {
    this.invalidate();
    this.filters.update((filters) => filters.map((filter, position) => {
      if (position !== index) return filter;
      if (field === 'field') return { field: value, operator: this.column(value)?.operators[0] ?? '', value: '' };
      if (field === 'operator') return { ...filter, operator: value, value: this.needsValue(value) ? filter.value : '' };
      return { ...filter, value };
    }));
  }

  removeFilter(index: number) {
    this.invalidate();
    this.filters.update((filters) => filters.filter((_, position) => position !== index));
  }

  addOrder() {
    const field = this.source()?.sortable.find((key) => !this.ordering().some((item) => item.field === key));
    if (!field || this.ordering().length >= 3) return;
    this.invalidate();
    this.ordering.update((orders) => [...orders, { field, direction: 'asc' }]);
  }

  editOrder(index: number, field: keyof ReportOrder, value: string) {
    this.invalidate();
    this.ordering.update((orders) => orders.map((order, position) => position !== index ? order :
      field === 'field' ? { ...order, field: value } : { ...order, direction: value === 'desc' ? 'desc' : 'asc' }
    ));
  }

  removeOrder(index: number) {
    this.invalidate();
    this.ordering.update((orders) => orders.filter((_, position) => position !== index));
  }

  orderTaken(key: string, index: number) {
    return this.ordering().some((order, position) => position !== index && order.field === key);
  }

  column(key: string) { return this.source()?.columns.find((column) => column.key === key); }
  operatorLabel(key: string) { return OPERATOR_LABELS[key] ?? key; }
  formatLabel(key: string) { return FORMAT_LABELS[key]; }
  needsValue(operator: string) { return operator !== 'is_empty' && operator !== 'not_empty'; }

  apply(event: Event) {
    event.preventDefault();
    this.invalidate();
    const source = this.source();
    if (!source) return;
    const columns = this.columns();
    const filters = this.filters();
    const dates = this.dates();
    if (!columns.length) {
      this.error.set('Selecciona al menos una columna.');
      return;
    }
    if (filters.some((filter) => this.needsValue(filter.operator) && !filter.value.trim())) {
      this.error.set('Completa los valores de los filtros antes de consultar.');
      return;
    }
    if (dates.date_from && dates.date_to) {
      const days = (Date.parse(dates.date_to) - Date.parse(dates.date_from)) / 86_400_000;
      if (!Number.isFinite(days) || days < 0 || days >= 366) {
        this.error.set('Selecciona un período válido de hasta 366 días.');
        return;
      }
    }
    this.preview({
      source: source.key, columns: [...columns], filters: filters.map((filter) => ({ ...filter })),
      ordering: this.ordering().map((order) => ({ ...order })), page: 1, page_size: this.pageSize(),
      ...(dates.date_from ? { date_from: dates.date_from } : {}),
      ...(dates.date_to ? { date_to: dates.date_to } : {}),
    });
  }

  goTo(page: number) {
    const result = this.result();
    if (this.applied && result && page >= 1 && page <= result.pagination.pages) {
      this.preview({ ...this.applied, page });
    }
  }

  download(format: string) {
    const tenant = this.currentTenant();
    const query = this.applied;
    const result = this.result();
    if (tenant === null || this.busy() || !query || !result?.can_export[format] || !this.formats().includes(format)) return;
    this.run('export', this.api.export(tenant, query, format), (blob) => {
      if (!blob.size) {
        this.error.set('El archivo llegó vacío. Vuelve a intentar.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeSource = query.source.replace(/[^a-z0-9_-]/gi, '');
      link.href = url;
      link.download = `cu30-${safeSource || 'reporte'}.${format}`;
      try {
        link.click();
        this.downloaded.set(true);
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });
  }

  private preview(query: ReportQuery) {
    const tenant = this.currentTenant();
    if (tenant === null) return;
    this.result.set(null);
    this.applied = undefined;
    this.run('preview', this.api.preview(tenant, query), (result) => {
      if (result.source !== query.source) {
        this.error.set('La respuesta no coincide con la fuente solicitada.');
        return;
      }
      this.applied = { ...query, date_from: result.period.date_from, date_to: result.period.date_to };
      this.result.set(result);
    });
  }

  private run<T>(job: Job, request: Observable<T>, accept: (value: T) => void) {
    this.cancel();
    this.error.set('');
    this.downloaded.set(false);
    this.busy.set(job);
    const generation = this.generation;
    const tenant = this.currentTenant();
    const isCurrent = () => !this.destroyRef.destroyed && tenant !== null &&
      this.currentTenant() === tenant && generation === this.generation;
    this.pending = request.subscribe({
      next: (value) => {
        if (!isCurrent()) return;
        this.busy.set(null);
        accept(value);
      },
      error: (error: unknown) => {
        if (!isCurrent()) return;
        this.busy.set(null);
        const status = error instanceof HttpErrorResponse ? error.status : null;
        if (status === 401 || status === 403) this.clear();
        this.error.set(
          status === 401 ? 'Tu sesión venció. Inicia sesión de nuevo.' :
          status === 403 ? 'No tienes acceso a reportes en este condominio.' :
          status === 400 ? 'Revisa el período, las columnas y los filtros. Si exportas, comprueba el límite de filas.' :
          status === 0 ? 'No pudimos conectar con TAJI. Revisa tu conexión y reintenta.' :
          'No pudimos completar la operación. Vuelve a intentar.',
        );
      },
    });
  }

  private cancel() {
    this.generation++;
    this.pending?.unsubscribe();
    this.pending = undefined;
    this.busy.set(null);
  }

  private invalidate() {
    this.cancel();
    this.applied = undefined;
    this.result.set(null);
    this.error.set('');
    this.downloaded.set(false);
  }

  private clear() {
    this.invalidate();
    this.catalog.set(null);
    this.sourceKey.set('');
    this.columns.set([]);
    this.filters.set([]);
    this.ordering.set([]);
  }
}
