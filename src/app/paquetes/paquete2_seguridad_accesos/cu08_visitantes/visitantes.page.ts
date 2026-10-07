import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs/operators';

import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { VisitDetailComponent } from './visit-detail.component';
import { VisitEditorComponent } from './visit-editor.component';
import { VisitantesApi } from './visitantes.api';
import {
  ResidentDirectoryItem,
  UnitDirectoryItem,
  VisitAuthorization,
  VisitOptions,
  VisitPagination,
  VisitQuery,
} from './visitantes.models';

const INITIAL_PAGINATION: VisitPagination = {
  page: 1,
  page_size: 20,
  total_items: 0,
  total_pages: 1,
  next: null,
  previous: null,
};

@Component({
  selector: 'taji-visitantes-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    VisitEditorComponent,
    VisitDetailComponent,
  ],
  templateUrl: './visitantes.page.html',
  styleUrls: ['./visitantes.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitantesPage implements OnInit {
  private readonly api = inject(VisitantesApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.auth.user;

  readonly isResidentActor = computed(() => {
    const u = this.user();
    if (!u) return false;
    if (u.is_superuser) return false;
    const permissions = u.role?.permissions ?? [];
    return permissions.includes('register_visits') && !permissions.includes('manage_visits');
  });

  readonly residentUnitOptions = computed(() => {
    const u = this.user();
    if (!u || !u.resident_units) return [];
    return u.resident_units.map((ru) => ({
      unit_id: ru.unit_id,
      unit_code: ru.unit_code,
    }));
  });

  // Estado reactivo
  readonly visits = signal<VisitAuthorization[]>([]);
  readonly pagination = signal<VisitPagination>(INITIAL_PAGINATION);
  readonly loading = signal<boolean>(false);
  readonly options = signal<VisitOptions>({
    statuses: [
      { value: 'AUTHORIZED', label: 'Autorizada' },
      { value: 'ACTIVE', label: 'En recinto' },
      { value: 'FINISHED', label: 'Finalizada' },
      { value: 'CANCELLED', label: 'Cancelada' },
      { value: 'EXPIRED', label: 'Expirada' },
    ],
    document_types: [
      { value: 'CI', label: 'Cédula de Identidad' },
      { value: 'PASSPORT', label: 'Pasaporte' },
      { value: 'FOREIGN_ID', label: 'Cédula Extranjera' },
      { value: 'OTHER', label: 'Otro Documento' },
    ],
  });
  readonly units = signal<UnitDirectoryItem[]>([]);
  readonly unitsError = signal('');
  readonly residents = signal<ResidentDirectoryItem[]>([]);

  readonly selectedVisit = signal<VisitAuthorization | null>(null);
  readonly isEditorOpen = signal<boolean>(false);
  readonly isDetailOpen = signal<boolean>(false);

  readonly successMessage = signal<string>('');
  readonly errorMessage = signal<string>('');

  // Métricas
  readonly authorizedCount = computed(
    () => this.visits().filter((v) => v.status === 'AUTHORIZED').length,
  );
  readonly activeCount = computed(
    () => this.visits().filter((v) => v.status === 'ACTIVE').length,
  );
  readonly concludedCount = computed(
    () =>
      this.visits().filter(
        (v) => v.status === 'FINISHED' || v.status === 'EXPIRED' || v.status === 'CANCELLED',
      ).length,
  );

  filterForm!: FormGroup;

  ngOnInit(): void {
    this.buildFilterForm();
    this.loadCatalogData();
    this.load();
  }

  private buildFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      unit: [''],
      date_from: [''],
      date_to: [''],
    });

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.goToPage(1);
      });
  }

  private loadCatalogData(): void {
    this.api
      .options()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opts) => {
          if (opts.statuses?.length && opts.document_types?.length) {
            this.options.set(opts);
          }
        },
        error: () => {},
      });

    this.api
      .units()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.unitsError.set('');
          this.units.set(Array.isArray(res) ? res : res.results || []);
        },
        error: () => {
          this.unitsError.set('No fue posible cargar las unidades del condominio.');
        },
      });

    if (!this.isResidentActor()) {
      this.api
        .residents()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => this.residents.set(res.results || []),
          error: () => {},
        });
    }
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const raw = this.filterForm.value;
    const query: VisitQuery = {
      page: this.pagination().page,
      page_size: this.pagination().page_size,
      search: raw.search?.trim() || undefined,
      status: raw.status || undefined,
      unit: raw.unit || undefined,
      date_from: raw.date_from || undefined,
      date_to: raw.date_to || undefined,
    };

    this.api
      .list(query)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.visits.set(response.results || []);
          if (response.pagination) {
            this.pagination.set(response.pagination);
          }
        },
        error: (err) => {
          this.errorMessage.set(
            apiErrorMessage(err, 'No fue posible cargar el listado de autorizaciones.'),
          );
        },
      });
  }

  hasActiveFilters(): boolean {
    const raw = this.filterForm.value;
    return Boolean(raw.search || raw.status || raw.unit || raw.date_from || raw.date_to);
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      unit: '',
      date_from: '',
      date_to: '',
    });
  }

  goToPage(page: number): void {
    this.pagination.update((prev) => ({ ...prev, page }));
    this.load();
  }

  canEditVisit(visit: VisitAuthorization): boolean {
    return visit.status === 'AUTHORIZED';
  }

  canCancelVisit(visit: VisitAuthorization): boolean {
    return (
      (visit.status === 'AUTHORIZED' || visit.status === 'ACTIVE') &&
      !visit.cancelled_at
    );
  }

  openCreate(): void {
    // Las unidades y residentes pueden haber sido creados en otra pantalla.
    // Volvemos a consultar los catálogos al abrir el modal para no usar datos obsoletos.
    this.loadCatalogData();
    this.selectedVisit.set(null);
    this.isEditorOpen.set(true);
  }

  openEdit(visit: VisitAuthorization): void {
    this.selectedVisit.set(visit);
    this.isDetailOpen.set(false);
    this.isEditorOpen.set(true);
  }

  openDetail(visit: VisitAuthorization): void {
    this.selectedVisit.set(visit);
    this.isDetailOpen.set(true);
  }

  closeEditor(): void {
    this.isEditorOpen.set(false);
    this.selectedVisit.set(null);
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.selectedVisit.set(null);
  }

  onVisitSaved(saved: VisitAuthorization): void {
    this.closeEditor();
    this.showSuccess(
      `Autorización de visita para "${saved.visitor.full_name}" guardada correctamente.`,
    );
    this.load();
  }

  onVisitCancelled(cancelled: VisitAuthorization): void {
    this.closeDetail();
    this.showSuccess(`Autorización #${cancelled.id} cancelada con éxito.`);
    this.load();
  }

  cancelVisit(visit: VisitAuthorization): void {
    if (
      !confirm(
        `¿Deseas cancelar la autorización de visita para "${visit.visitor.full_name}"?`,
      )
    ) {
      return;
    }

    this.loading.set(true);
    this.api
      .cancel(visit.id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showSuccess(
            `Autorización para "${visit.visitor.full_name}" cancelada exitosamente.`,
          );
          this.load();
        },
        error: (err) => {
          this.errorMessage.set(
            apiErrorMessage(err, 'No fue posible cancelar la autorización.'),
          );
        },
      });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      if (this.successMessage() === msg) {
        this.successMessage.set('');
      }
    }, 4500);
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('es-BO', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return dateString;
    }
  }
}
