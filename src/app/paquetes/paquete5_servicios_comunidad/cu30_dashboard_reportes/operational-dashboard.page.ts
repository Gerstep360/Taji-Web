import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { Cu30ReportsComponent } from './cu30-reports.component';
import { DASHBOARD_ROLES, DashboardBucket, DashboardDates, DashboardDay, OperationalDashboard, OperationalDashboardApi } from './operational-dashboard.api';

interface DashboardQuery {
  scope: string;
  dates: DashboardDates;
}

type DashboardResult =
  | { query: DashboardQuery; data: OperationalDashboard }
  | { query: DashboardQuery; error: string };

interface DashboardPanel {
  title: string;
  icon: string;
  total: number;
  metrics: { label: string; value: number }[];
  daily: DashboardDay[];
  groups: { title: string; rows: DashboardBucket[] }[];
}

const EMPTY_DATES: DashboardDates = { date_from: '', date_to: '' };
const DAY_MS = 86_400_000;

@Component({
  selector: 'taji-operational-dashboard',
  imports: [IconComponent, Cu30ReportsComponent],
  templateUrl: './operational-dashboard.page.html',
  styleUrl: './operational-dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalDashboardPage {
  private readonly auth = inject(AuthService);
  private readonly api = inject(OperationalDashboardApi);
  readonly tenant = this.auth.activeTenant;
  readonly isSuperuser = computed(() => !!this.auth.user()?.is_superuser);
  readonly availableTenants = computed(() => this.auth.user()?.available_tenants ?? []);
  readonly tenantOptions = computed(() => {
    const current = this.tenant();
    const available = this.availableTenants();
    if (!current) return available;
    const exists = available.some((t) => t.id === current.id);
    return exists ? available : [current, ...available];
  });
  readonly switchingTenant = signal<boolean>(false);
  readonly switchError = signal<string | null>(null);
  readonly allowed = computed(() => {
    const user = this.auth.user();
    return !!user && (user.is_superuser || DASHBOARD_ROLES.includes(user.role?.slug.toLowerCase() ?? ''));
  });
  private readonly scope = computed(() => {
    const user = this.auth.user();
    const tenant = this.tenant();
    return this.allowed() && user && tenant ? `${user.id}:${tenant.id}` : null;
  });
  readonly section = signal<'summary' | 'reports'>('summary');
  readonly reportContexts = computed(() => {
    const scope = this.scope();
    return scope ? [scope] : [];
  });
  private readonly explicitQuery = signal<DashboardQuery | null>(null);
  private readonly query = computed<DashboardQuery | null>(() => {
    const scope = this.scope();
    if (!scope) return null;
    const explicit = this.explicitQuery();
    return explicit?.scope === scope ? explicit : { scope, dates: EMPTY_DATES };
  }, { equal: (left, right) => left?.scope === right?.scope && left?.dates === right?.dates });
  private readonly result = signal<DashboardResult | null>(null);
  private readonly draft = signal<DashboardQuery | null>(null);
  private readonly visibleResult = computed(() => {
    const result = this.result();
    return result?.query === this.query() ? result : null;
  });
  readonly data = computed(() => {
    const result = this.visibleResult();
    return result && 'data' in result ? result.data : null;
  });
  readonly error = computed(() => {
    const result = this.visibleResult();
    return result && 'error' in result ? result.error : null;
  });
  readonly loading = computed(() => this.query() !== null && this.visibleResult() === null);
  readonly dates = computed(() => {
    const draft = this.draft();
    return draft?.scope === this.scope() ? draft?.dates ?? EMPTY_DATES : this.data()?.period ?? EMPTY_DATES;
  });
  private readonly rejectedDates = signal<DashboardDates | null>(null);
  readonly dateError = computed(() =>
    this.rejectedDates() === this.dates() ? 'Indica un período válido de hasta 366 días.' : null,
  );
  readonly lastUpdated = computed(() => {
    const data = this.data();
    return data ? new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'short', timeStyle: 'short', timeZone: data.context.timezone,
    }).format(new Date(data.period.as_of)) : '';
  });
  readonly panels = computed<DashboardPanel[]>(() => {
    const data = this.data();
    if (!data) return [];
    const { security, incidents, maintenance, reservations } = data;
    if (!security || !incidents || !maintenance || !reservations) return [];
    return [
      {
        title: 'Seguridad y accesos', icon: 'shield', total: security.total, daily: security.daily,
        metrics: [
          { label: 'Entradas', value: security.entries }, { label: 'Salidas', value: security.exits },
          { label: 'Denegados', value: security.denied },
        ],
        groups: [{ title: 'Resultado de validación', rows: security.by_result }],
      },
      {
        title: 'Incidencias', icon: 'bell', total: incidents.total, daily: incidents.daily,
        metrics: [{ label: 'Pendientes', value: incidents.pending }, { label: 'Resueltas', value: incidents.resolved }],
        groups: [
          { title: 'Por estado', rows: incidents.by_status }, { title: 'Por prioridad', rows: incidents.by_priority },
        ],
      },
      {
        title: 'Mantenimiento', icon: 'wrench', total: maintenance.total, daily: maintenance.daily,
        metrics: [
          { label: 'Pendientes', value: maintenance.pending }, { label: 'En proceso', value: maintenance.in_progress },
          { label: 'Completadas', value: maintenance.completed },
          { label: 'Órdenes con programación atrasada', value: maintenance.overdue },
        ],
        groups: [{ title: 'Por estado', rows: maintenance.by_status }],
      },
      {
        title: 'Reservas', icon: 'calendar', total: reservations.total, daily: reservations.daily,
        metrics: [
          { label: 'Pendientes', value: reservations.pending }, { label: 'Aprobadas', value: reservations.approved },
          { label: 'Rechazadas', value: reservations.rejected }, { label: 'Canceladas', value: reservations.cancelled },
          { label: 'Completadas', value: reservations.completed },
        ],
        groups: [{ title: 'Por estado', rows: reservations.by_status }, { title: 'Por área común', rows: reservations.by_area }],
      },
    ];
  });

  constructor() {
    effect((onCleanup) => {
      const query = this.query();
      const tenantId = untracked(() => this.tenant()?.id);
      this.result.set(null);
      if (!query || tenantId === undefined) return;
      const subscription = this.api.load(tenantId, query.dates).subscribe({
        next: (data) => {
          if (this.query() !== query) return;
          this.result.set(data.context.mode === 'condominium' && data.context.id === tenantId
            ? { query, data }
            : { query, error: 'El contexto operativo no está disponible. Vuelve a intentar.' });
        },
        error: (error: unknown) => {
          if (this.query() === query) this.result.set({ query, error: this.errorMessage(error) });
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
    effect(() => {
      const scope = this.scope();
      untracked(() => {
        if (this.explicitQuery()?.scope !== scope) this.explicitQuery.set(null);
        if (this.draft()?.scope !== scope) this.draft.set(null);
        this.rejectedDates.set(null);
      });
    });
  }

  edit(field: keyof DashboardDates, value: string) {
    const scope = this.scope();
    if (scope) this.draft.set({ scope, dates: { ...this.dates(), [field]: value } });
  }

  apply(event: Event) {
    event.preventDefault();
    const scope = this.scope();
    if (!scope) return;
    const dates = this.dates();
    if (!this.validDates(dates)) {
      this.rejectedDates.set(dates);
      return;
    }
    this.rejectedDates.set(null);
    this.explicitQuery.set({ scope, dates: { date_from: dates.date_from, date_to: dates.date_to } });
  }

  refresh() {
    const query = this.query();
    if (query) this.explicitQuery.set({ ...query, dates: { ...query.dates } });
  }

  async onTenantChange(targetTenantIdRaw: string | number) {
    const targetTenantId = Number(targetTenantIdRaw);
    if (!targetTenantId || targetTenantId === this.tenant()?.id) return;

    this.result.set(null);
    this.explicitQuery.set(null);
    this.draft.set(null);
    this.switchingTenant.set(true);
    this.switchError.set(null);

    try {
      await firstValueFrom(this.api.switchTenant(targetTenantId));
      await this.auth.restoreSession();
      if (this.tenant()?.id !== targetTenantId) {
        throw new Error('La sincronización de condominio no se completó.');
      }
    } catch {
      this.switchError.set('No se pudo cambiar de condominio. Por favor reintenta.');
      try {
        await this.auth.restoreSession();
      } catch {
        // Ignorar error secundario de re-sincronización
      }
    } finally {
      this.switchingTenant.set(false);
    }
  }

  peak(rows: readonly { count: number }[]): number {
    return rows.reduce((peak, row) => Math.max(peak, row.count), 0);
  }

  private validDates({ date_from, date_to }: DashboardDates): boolean {
    const parse = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
      const date = new Date(`${value}T00:00:00Z`);
      const time = date.getTime();
      return Number.isFinite(time) && date.toISOString().slice(0, 10) === value ? time : NaN;
    };
    const start = parse(date_from);
    const end = parse(date_to);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start && (end - start) / DAY_MS < 366;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) return 'El período no es válido. Revisa las fechas seleccionadas.';
      if (error.status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.';
      if (error.status === 403) return 'No tienes acceso al dashboard en el contexto operativo actual.';
      if (error.status === 0) return 'No pudimos conectar con TAJI. Revisa tu conexión y reintenta.';
    }
    return 'No pudimos cargar el dashboard. Vuelve a intentar.';
  }
}
