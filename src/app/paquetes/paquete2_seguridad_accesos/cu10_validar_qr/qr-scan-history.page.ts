import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { QrScanHistoryApi } from './qr-scan-history.api';
import {
  EMPTY_SCAN_SUMMARY,
  QrScanFilters,
  QrScanGuard,
  QrScanHistoryResponse,
  QrScanResult,
  QrScanRow,
  scanReasonLabel,
} from './qr-scan-history.models';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Tablero de escaneos de portería (RF-10 / CU10).
 *
 * Responde las tres preguntas que la guardia se hacía sin respuesta antes:
 * ¿cuántos escaneos hubo?, ¿cuántos dejaron pasar el ingreso? y
 * ¿cuántos fallaron y por qué?
 */
@Component({
  selector: 'taji-qr-scan-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe, DecimalPipe],
  templateUrl: './qr-scan-history.page.html',
  styleUrl: './qr-scan-history.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrScanHistoryPage implements OnInit {
  private readonly api = inject(QrScanHistoryApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = inject(DatePipe);

  readonly rows = signal<QrScanRow[]>([]);
  readonly guards = signal<QrScanGuard[]>([]);
  readonly summary = signal(EMPTY_SCAN_SUMMARY);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly totalPages = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly days = signal(7);
  readonly result = signal<QrScanResult | ''>('');
  readonly guardStaffId = signal<number | null>(null);
  readonly search = signal('');

  /** Filtro de texto aplicado, para no consultar en cada tecla. */
  private appliedSearch = '';

  ngOnInit(): void {
    this.load();
    this.api
      .guards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guards) => this.guards.set(guards),
        // El filtro por guardia es una comodidad: si falla, el resto de la
        // pantalla debe seguir siendo utilizable.
        error: () => this.guards.set([]),
      });
  }

  load(page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);

    const filters: QrScanFilters = {
      result: this.result(),
      guard_staff_id: this.guardStaffId(),
      days: this.days(),
      search: this.appliedSearch,
      page,
      page_size: this.pageSize(),
    };

    this.api
      .list(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response: QrScanHistoryResponse) => {
          this.rows.set(response.results ?? []);
          this.summary.set(response.summary ?? EMPTY_SCAN_SUMMARY);
          this.total.set(response.count ?? 0);
          this.totalPages.set(response.total_pages ?? 1);
        },
        error: (err) => {
          this.rows.set([]);
          this.summary.set(EMPTY_SCAN_SUMMARY);
          this.total.set(0);
          this.error.set(
            err?.error?.error?.message ??
              err?.error?.detail ??
              'No se pudo cargar el historial de escaneos.'
          );
        },
      });
  }

  /** Aplica los filtros y vuelve a la primera página. */
  applyFilters(): void {
    this.appliedSearch = this.search().trim();
    this.load(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.appliedSearch = '';
    this.result.set('');
    this.guardStaffId.set(null);
    this.days.set(7);
    this.load(1);
  }

  setResult(value: QrScanResult | ''): void {
    this.result.set(value);
    this.load(1);
  }

  onGuardChange(raw: string): void {
    const parsed = Number(raw);
    this.guardStaffId.set(raw && !Number.isNaN(parsed) ? parsed : null);
    this.load(1);
  }

  onDaysChange(raw: string): void {
    const parsed = Number(raw);
    this.days.set(raw && !Number.isNaN(parsed) ? parsed : 7);
    this.load(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.load(page);
  }

  reasonLabel(reason: string): string {
    return scanReasonLabel(reason);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    return this.datePipe.transform(value, 'dd/MM/yyyy HH:mm') ?? '';
  }

  /** Clase CSS del distintivo según el resultado del escaneo. */
  badgeClass(row: QrScanRow): string {
    return `badge-${row.result.toLowerCase()}`;
  }

  trackById(_index: number, row: QrScanRow): number {
    return row.id;
  }

  get hasActiveFilters(): boolean {
    return (
      this.result() !== '' ||
      this.guardStaffId() !== null ||
      this.days() !== 7 ||
      this.appliedSearch !== ''
    );
  }

  get rangeStart(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page() * this.pageSize(), this.total());
  }
}
