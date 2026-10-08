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

import { apiErrorMessage } from '../api-error';
import {
  PlatformTenant,
  PlatformTenantsApi,
  PlatformTenantsSummary,
} from './platform-tenants.api';

/**
 * Consola global de la plataforma (solo lectura).
 *
 * Existe para que un administrador global pueda ver de un vistazo cuantos
 * condominios hay, en que estado estan y cuantos usuarios usan cada uno. Es
 * deliberadamente de solo lectura: no hay botones de crear, editar ni borrar,
 * porque la gestion de tenants sigue siendo de `saas/tenants/`.
 */
@Component({
  selector: 'taji-platform-tenants-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './platform-tenants.page.html',
  styleUrl: './platform-tenants.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformTenantsPage implements OnInit {
  private readonly api = inject(PlatformTenantsApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<PlatformTenant[]>([]);
  readonly summary = signal<PlatformTenantsSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly search = signal('');
  readonly status = signal('');
  readonly subscription = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);

  /** Filtro de texto ya aplicado, para no consultar en cada tecla. */
  private appliedSearch = '';

  ngOnInit(): void {
    this.load();
    this.loadSummary();
  }

  load(page = this.page()): void {
    this.loading.set(true);
    this.error.set('');
    this.page.set(page);

    this.api
      .list({
        search: this.appliedSearch,
        status: this.status(),
        subscription_status: this.subscription(),
        page,
        page_size: 20,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.rows.set(response.rows);
          this.total.set(response.total);
          this.totalPages.set(Math.max(response.totalPages, 1));
        },
        error: (err) => {
          this.rows.set([]);
          this.total.set(0);
          this.error.set(apiErrorMessage(err, 'No se pudo cargar el listado de condominios.'));
        },
      });
  }

  /**
   * El resumen va en una llamada aparte a propósito: si fallara, el listado
   * sigue siendo utilizable. Son datos de supporting, no la vista principal.
   */
  loadSummary(): void {
    this.api
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => this.summary.set(null),
      });
  }

  applyFilters(): void {
    this.appliedSearch = this.search().trim();
    this.load(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.appliedSearch = '';
    this.status.set('');
    this.subscription.set('');
    this.load(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.load(page);
  }

  get hasActiveFilters(): boolean {
    return this.appliedSearch !== '' || this.status() !== '' || this.subscription() !== '';
  }

  get rangeStart(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * 20 + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page() * 20, this.total());
  }

  trackById(_index: number, row: PlatformTenant): number {
    return row.id;
  }

  /** Iniciales para el avatar de cada condominio. */
  initials(tenant: PlatformTenant): string {
    const words = tenant.name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'TJ';
    const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
    return letters.toUpperCase();
  }

  /**
   * Estado de la suscripción listo para pintar.
   *
   * Distingue tres casos que la UI debe separar: sin plan, plan vigente y plan
   * que ya no es válido.
   */
  subscriptionBadge(tenant: PlatformTenant): { label: string; className: string } {
    if (tenant.subscription_status === 'NO_SUBSCRIPTION') {
      return { label: 'Sin plan', className: 'badge-none' };
    }
    if (tenant.is_subscription_valid) {
      return { label: tenant.subscription_status_display || 'Activa', className: 'badge-valid' };
    }
    return { label: tenant.subscription_status_display || 'Vencida', className: 'badge-expired' };
  }

  /** "Sin plan" y "vence en 0 días" no deben verse igual. */
  subscriptionHint(tenant: PlatformTenant): string {
    if (tenant.subscription_status === 'NO_SUBSCRIPTION') return 'No tiene plan asignado';
    if (tenant.days_left === null) return '';
    if (tenant.days_left <= 0) return 'Periodo vencido';
    return `Quedan ${tenant.days_left} día${tenant.days_left === 1 ? '' : 's'}`;
  }
}
