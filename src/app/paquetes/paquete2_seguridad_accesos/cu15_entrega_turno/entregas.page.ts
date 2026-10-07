import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { EntregasApi, Handover } from './entregas.api';
import { AuthService } from '../../../core/auth/auth.service';
import { StaffApi } from '../../paquete1_usuarios_condominio/cu07_personal/staff.api';
import { StaffMember } from '../../paquete1_usuarios_condominio/cu07_personal/staff.models';
import { ENTRY_TYPES, SEVERITIES } from '../cu14_novedades_incidentes/novedades.models';

@Component({
  selector: 'taji-entregas-page', imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './entregas.page.html',
  styleUrls: ['../cu13_turnos_seguridad/turnos.page.scss', '../cu14_novedades_incidentes/novedades.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntregasPage implements OnInit {
  private readonly api = inject(EntregasApi);
  private readonly auth = inject(AuthService);
  private readonly staffApi = inject(StaffApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<Record<string, string | number>>();
  private readonly details = new Subject<number>();
  readonly entries = signal<Handover[]>([]);
  readonly guards = signal<StaffMember[]>([]);
  readonly selected = signal<Handover | null>(null);
  readonly detailLoading = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1); readonly pages = signal(1); readonly total = signal(0);
  status = ''; guard = ''; condominium = ''; dateFrom = ''; dateTo = '';
  ngOnInit(): void {
    this.requests.pipe(switchMap(query => this.api.list(query).pipe(catchError(err => {
      this.error.set(err?.error?.error?.message ?? 'No se pudieron cargar las entregas.'); return of(null);
    }))), takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      this.loading.set(false); this.entries.set(response?.results ?? []);
      if (response) {
        this.page.set(response.pagination.page); this.pages.set(response.pagination.total_pages); this.total.set(response.pagination.total_items);
      }
    });
    this.details.pipe(switchMap(id => this.api.detail(id).pipe(catchError(err => {
      this.error.set(err?.error?.error?.message ?? 'No se pudo consultar el detalle.'); return of(null);
    }))), takeUntilDestroyed(this.destroyRef)).subscribe(detail => { this.detailLoading.set(false); this.selected.set(detail); });
    this.load();
    const user = this.auth.user();
    if (user?.is_superuser || user?.role?.permissions.includes('manage_security_shifts') ||
        ['admin', 'administrador', 'directiva', 'directorio'].includes(user?.role?.slug ?? '')) {
      this.staffApi.list({ page: 1, page_size: 100, staff_type: 'SECURITY' }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: response => this.guards.set(response.results),
        error: () => this.error.set('No se pudo cargar la lista de guardias. Puedes usar los demás filtros.'),
      });
    }
  }
  load(page = 1): void {
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.error.set('La fecha final no puede ser anterior a la inicial.'); return;
    }
    this.loading.set(true); this.error.set('');
    this.requests.next({ page, status: this.status, guard: this.guard, condominium: this.condominium, date_from: this.dateFrom, date_to: this.dateTo });
  }
  detail(id: number): void { this.selected.set(null); this.error.set(''); this.detailLoading.set(true); this.details.next(id); }
  statusLabel(status: string): string { return ({ PENDING: 'Pendiente de recepción', RECEIVED: 'Recibida', REJECTED: 'Rechazada' } as Record<string, string>)[status] ?? status; }
  typeLabel(value: string): string { return ENTRY_TYPES.find(t => t.value === value)?.label ?? value; }
  severityLabel(value: string): string { return SEVERITIES.find(t => t.value === value)?.label ?? value; }
}
