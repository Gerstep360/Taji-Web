import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '../../../shared/ui/icon.component';
import { AuditApi } from './audit.api';
import { AuditEventItem, AuditPagination } from './audit.models';

interface CategoryOption {
  value: string;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { value: '', label: 'Todas las actividades' },
  { value: 'auth', label: 'Autenticación y Sesiones' },
  { value: 'roles', label: 'Roles y Permisos' },
  { value: 'users', label: 'Usuarios y Residentes' },
  { value: 'condominium', label: 'Condominio y Unidades' },
  { value: 'staff', label: 'Personal' },
];

const DEFAULT_PAGINATION: AuditPagination = {
  page: 1,
  page_size: 20,
  total_items: 0,
  total_pages: 1,
  next: null,
  previous: null,
};

@Component({
  selector: 'taji-auditoria-page',
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './auditoria.page.html',
  styleUrls: ['./auditoria.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaPage implements OnInit {
  private readonly auditApi = inject(AuditApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = CATEGORIES;
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly events = signal<AuditEventItem[]>([]);
  readonly pagination = signal<AuditPagination>(DEFAULT_PAGINATION);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedCategory = signal('');
  readonly selectedEvent = signal<AuditEventItem | null>(null);

  readonly totalEvents = computed(() => this.pagination().total_items);

  readonly lastEvent = computed(() => {
    const list = this.events();
    return list.length > 0 ? list[0] : null;
  });

  ngOnInit(): void {
    this.loadEvents(1);

    this.searchControl.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadEvents(1);
      });
  }

  loadEvents(page = 1): void {
    this.loading.set(true);
    this.error.set(null);

    const query = {
      page,
      page_size: 20,
      search: this.searchControl.value.trim(),
      category: this.selectedCategory(),
    };

    this.auditApi
      .list(query)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.events.set(response.results);
          this.pagination.set(response.pagination);
        },
        error: (err) => {
          this.error.set(
            err?.error?.detail ||
              'No se pudo cargar la bitácora de auditoría. Verifica que cuentes con permisos de Administrador.',
          );
        },
      });
  }

  selectCategory(category: string): void {
    if (this.selectedCategory() !== category) {
      this.selectedCategory.set(category);
      this.loadEvents(1);
    }
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.selectedCategory.set('');
    this.loadEvents(1);
  }

  nextPage(): void {
    const p = this.pagination();
    if (p.next && p.page < p.total_pages) {
      this.loadEvents(p.page + 1);
    }
  }

  prevPage(): void {
    const p = this.pagination();
    if (p.previous && p.page > 1) {
      this.loadEvents(p.page - 1);
    }
  }

  openDetails(event: AuditEventItem): void {
    this.selectedEvent.set(event);
  }

  closeDetails(): void {
    this.selectedEvent.set(null);
  }

  formatDatePart(isoString: string): string {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  }

  formatTimePart(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  }

  getActionBadge(actionCode: string): { class: string; label: string } {
    switch (actionCode) {
      case 'auth.login.success':
        return { class: 'pill-success', label: 'Login Exitoso' };
      case 'auth.login.failed':
        return { class: 'pill-danger', label: 'Login Fallido' };
      case 'auth.login.locked':
        return { class: 'pill-danger', label: 'Bloqueo Seguridad' };
      case 'auth.logout':
        return { class: 'pill-neutral', label: 'Cierre de Sesión' };
      case 'auth.register':
        return { class: 'pill-info', label: 'Registro Cuenta' };
      case 'auth.password_reset.requested':
        return { class: 'pill-warning', label: 'Solicitud Clave' };
      case 'auth.password_reset.completed':
        return { class: 'pill-success', label: 'Cambio de Clave' };
      case 'roles.permissions.updated':
        return { class: 'pill-warning', label: 'Permisos Actualizados' };
      case 'users.internal.created':
        return { class: 'pill-info', label: 'Usuario Creado' };
      case 'residents.approval.reviewed':
        return { class: 'pill-success', label: 'Aprobación Residente' };
      case 'condominium.updated':
        return { class: 'pill-warning', label: 'Config. Condominio' };
      case 'units.created':
      case 'sectors.created':
        return { class: 'pill-info', label: 'Unidad / Sector Creado' };
      case 'units.updated':
      case 'sectors.updated':
        return { class: 'pill-warning', label: 'Unidad / Sector Editado' };
      case 'units.deleted':
      case 'sectors.deleted':
        return { class: 'pill-danger', label: 'Unidad / Sector Borrado' };
      case 'resident_units.assigned':
        return { class: 'pill-info', label: 'Unidad Asignada' };
      case 'resident_units.unassigned':
        return { class: 'pill-warning', label: 'Unidad Desasignada' };
      case 'staff.created':
        return { class: 'pill-info', label: 'Personal Creado' };
      case 'staff.updated':
        return { class: 'pill-warning', label: 'Personal Editado' };
      case 'staff.deleted':
        return { class: 'pill-danger', label: 'Personal Eliminado' };
      default:
        return { class: 'pill-neutral', label: actionCode };
    }
  }

  toJsonString(data: any): string {
    if (!data) return 'Ninguno';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
