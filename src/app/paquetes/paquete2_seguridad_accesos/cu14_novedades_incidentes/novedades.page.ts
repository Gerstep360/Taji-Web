import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { IconComponent } from '../../../shared/ui/icon.component';
import { AuthService } from '../../../core/auth/auth.service';
import { StaffApi } from '../../paquete1_usuarios_condominio/cu07_personal/staff.api';
import { StaffMember } from '../../paquete1_usuarios_condominio/cu07_personal/staff.models';
import { NovedadesApi } from './novedades.api';
import { ENTRY_TYPES, SEVERITIES, ShiftLog, ShiftLogPage } from './novedades.models';

@Component({
  selector: 'taji-novedades-page',
  imports: [FormsModule, DatePipe, RouterLink, IconComponent],
  templateUrl: './novedades.page.html',
  styleUrls: ['../cu13_turnos_seguridad/turnos.page.scss', './novedades.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovedadesPage implements OnInit {
  private readonly api = inject(NovedadesApi);
  private readonly staffApi = inject(StaffApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<Record<string, string | number>>();
  readonly entries = signal<ShiftLog[]>([]);
  readonly guards = signal<StaffMember[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly types = ENTRY_TYPES;
  readonly severities = SEVERITIES;
  guard = ''; shift = ''; type = ''; severity = ''; dateFrom = ''; dateTo = ''; search = '';

  ngOnInit(): void {
    // switchMap cancela búsquedas anteriores: una respuesta lenta no reemplaza filtros nuevos.
    this.requests.pipe(
      switchMap(query => this.api.list(query).pipe(catchError(err => {
        this.error.set(err?.error?.error?.message ?? 'No se pudieron cargar las novedades.');
        return of(null);
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe(response => {
      this.loading.set(false);
      this.entries.set(response?.results ?? []);
      if (response) this.setPagination(response);
    });
    const user = this.auth.user();
    if (user?.is_superuser || user?.role?.permissions.includes('manage_security_shifts') ||
        ['admin', 'administrador', 'directiva', 'directorio'].includes(user?.role?.slug ?? '')) {
    this.staffApi.list({ staff_type: 'SECURITY', page: 1, page_size: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.guards.set(response.results),
      error: () => this.error.set('No se pudo cargar la lista de guardias. Puedes buscar por número de turno.'),
    });
    }
    this.load();
  }

  load(page = 1): void {
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.error.set('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.requests.next({ page, guard: this.guard, shift: this.shift, entry_type: this.type,
      severity: this.severity, date_from: this.dateFrom, date_to: this.dateTo, search: this.search.trim() });
  }
  private setPagination(response: ShiftLogPage): void {
    this.page.set(response.pagination.page);
    this.pages.set(response.pagination.total_pages);
    this.total.set(response.pagination.total_items);
  }
  typeLabel(value: string): string { return this.types.find(t => t.value === value)?.label ?? value; }
  severityLabel(value: string): string { return this.severities.find(t => t.value === value)?.label ?? value; }
}
