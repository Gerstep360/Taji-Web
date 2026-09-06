import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { ResidentApi } from './resident.api';
import { ResidentEditorComponent } from './resident-editor.component';
import {
  ResidentListResponse,
  ResidentOptions,
  ResidentPayload,
  ResidentPerson,
} from './resident.models';

const EMPTY_OPTIONS: ResidentOptions = {
  statuses: [],
  document_types: [],
};

const EMPTY_PAGINATION: ResidentListResponse['pagination'] = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 0,
  next: null,
  previous: null,
};

@Component({
  selector: 'taji-resident-page',
  imports: [ReactiveFormsModule, ResidentEditorComponent],
  template: `
    <section class="resident-page" aria-labelledby="resident-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Administración · CU05</span>
          <h2 id="resident-title">Residentes y copropietarios</h2>
          <p>Registra a las personas que habitan el condominio y gestiona su estado.</p>
        </div>
        <button class="primary-action" type="button" (click)="openCreate()">
          <span aria-hidden="true">+</span> Nuevo residente
        </button>
      </header>

      @if (successMessage()) {
        <div class="notice success" role="status">
          <span aria-hidden="true">✓</span>{{ successMessage() }}
        </div>
      }
      @if (loadError()) {
        <div class="notice error" role="alert">
          <span>{{ loadError() }}</span>
          <button type="button" (click)="load()">Reintentar</button>
        </div>
      }

      <section class="summary-strip" aria-label="Resumen de residentes">
        <div class="summary-number">
          <strong>{{ pagination().total_items }}</strong
          ><span>residentes registrados</span>
        </div>
      </section>

      <form class="filters" [formGroup]="filters" aria-label="Filtros de residentes">
        <label class="search-field">
          <span class="sr-only">Buscar residente</span>
          <span aria-hidden="true">⌕</span>
          <input
            formControlName="search"
            type="search"
            placeholder="Buscar por nombre, CI, correo o teléfono"
          />
        </label>
        <label>
          <span>Estado</span>
          <select formControlName="status">
            <option value="">Todos los estados</option>
            @for (status of options().statuses; track status.value) {
              <option [value]="status.value">{{ status.label }}</option>
            }
          </select>
        </label>
        @if (hasFilters()) {
          <button class="clear-filter" type="button" (click)="clearFilters()">
            Limpiar filtros
          </button>
        }
      </form>

      <section class="directory" [attr.aria-busy]="loading()">
        @if (loading()) {
          <div class="loading-state" role="status">
            <span></span>
            <p>Actualizando directorio…</p>
          </div>
        } @else if (!residents().length) {
          <div class="empty-state">
            <span aria-hidden="true">TJ</span>
            <h3>{{ hasFilters() ? 'No encontramos coincidencias' : 'Aún no hay residentes' }}</h3>
            <p>
              {{
                hasFilters()
                  ? 'Prueba con otro nombre, documento o estado.'
                  : 'Registra al primer residente o copropietario del condominio.'
              }}
            </p>
            @if (!hasFilters()) {
              <button type="button" (click)="openCreate()">Registrar residente</button>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Residente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Registrado</th>
                  <th>Estado</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (resident of residents(); track resident.id) {
                  <tr>
                    <td>
                      <div class="identity">
                        <span>{{ initials(resident) }}</span>
                        <div>
                          <strong>{{ resident.full_name }}</strong>
                        </div>
                      </div>
                    </td>
                    <td data-label="Documento">{{ documentLabel(resident) }}</td>
                    <td data-label="Contacto">
                      <div class="contact">
                        <span>{{ resident.phone || 'Sin teléfono' }}</span
                        ><small>{{ resident.contact_email || 'Sin correo' }}</small>
                      </div>
                    </td>
                    <td data-label="Registrado">{{ formatDate(resident.registered_at) }}</td>
                    <td data-label="Estado">
                      <span [class]="'status-badge ' + statusClass(resident.status)">{{
                        resident.status_display
                      }}</span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button
                          type="button"
                          (click)="openView(resident)"
                          [attr.aria-label]="'Ver detalle de ' + resident.full_name"
                        >
                          Ver</button
                        ><button
                          type="button"
                          (click)="openEdit(resident)"
                          [attr.aria-label]="'Editar a ' + resident.full_name"
                        >
                          Editar</button
                        ><button
                          class="danger"
                          type="button"
                          (click)="toggleStatus(resident)"
                          [attr.aria-label]="
                            (resident.status === 'ACTIVE' ? 'Desactivar a ' : 'Activar a ') +
                            resident.full_name
                          "
                        >
                          {{ resident.status === 'ACTIVE' ? 'Desactivar' : 'Activar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <footer class="pagination" aria-label="Paginación">
            <span
              >Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ pagination().total_items }}</span
            >
            <div>
              <button
                type="button"
                [disabled]="!pagination().previous"
                (click)="changePage(-1)"
                aria-label="Página anterior"
              >
                ←</button
              ><span>Página {{ pagination().page }} de {{ pagination().total_pages || 1 }}</span
              ><button
                type="button"
                [disabled]="!pagination().next"
                (click)="changePage(1)"
                aria-label="Página siguiente"
              >
                →
              </button>
            </div>
          </footer>
        }
      </section>
    </section>

    @if (editorOpen()) {
      <taji-resident-editor
        [options]="options()"
        [resident]="editing()"
        [saving]="saving()"
        [formError]="formError()"
        [fieldErrors]="formFields()"
        (cancelled)="closeEditor()"
        (submitted)="save($event)"
      />
    }
  `,
  styleUrl: './resident.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentPage implements OnInit {
  private readonly api = inject(ResidentApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly residents = signal<ResidentPerson[]>([]);
  readonly options = signal<ResidentOptions>(EMPTY_OPTIONS);
  readonly pagination = signal(EMPTY_PAGINATION);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly formError = signal('');
  readonly formFields = signal<Record<string, string>>({});
  readonly successMessage = signal('');
  readonly editorOpen = signal(false);
  readonly editing = signal<ResidentPerson | null>(null);

  readonly filters = this.fb.nonNullable.group({ search: '', status: '' });

  readonly hasFilters = computed(() => Object.values(this.filters.getRawValue()).some(Boolean));
  readonly rangeStart = computed(() =>
    this.pagination().total_items
      ? (this.pagination().page - 1) * this.pagination().page_size + 1
      : 0,
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.pagination().page * this.pagination().page_size, this.pagination().total_items),
  );

  constructor() {
    this.filters.valueChanges
      .pipe(debounceTime(280), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(1));
  }

  ngOnInit(): void {
    this.loadOptions();
    this.load();
  }

  load(page = this.pagination().page): void {
    const filters = this.filters.getRawValue();
    this.loading.set(true);
    this.loadError.set('');
    this.api
      .list({ page, page_size: 10, ...filters })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.residents.set(response.results);
          this.pagination.set(response.pagination);
        },
        error: (error) =>
          this.loadError.set(apiErrorMessage(error, 'No pudimos cargar a los residentes.')),
      });
  }

  loadOptions(): void {
    this.api.options().subscribe({
      next: (options) => this.options.set(options),
      error: (error) =>
        this.loadError.set(apiErrorMessage(error, 'No pudimos cargar los estados disponibles.')),
    });
  }

  clearFilters(): void {
    this.filters.reset({ search: '', status: '' });
  }
  changePage(delta: number): void {
    this.load(this.pagination().page + delta);
  }

  openCreate(): void {
    this.editing.set(null);
    this.clearFormErrors();
    this.editorOpen.set(true);
  }

  openEdit(resident: ResidentPerson): void {
    this.editing.set(resident);
    this.clearFormErrors();
    this.editorOpen.set(true);
  }

  openView(resident: ResidentPerson): void {
    this.openEdit(resident);
  }

  closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }

  save(payload: ResidentPayload): void {
    this.saving.set(true);
    this.clearFormErrors();
    const request = this.editing()
      ? this.api.update(this.editing()!.id, payload)
      : this.api.create(payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.editorOpen.set(false);
        this.successMessage.set(
          this.editing()
            ? 'Los datos del residente fueron actualizados.'
            : 'El residente fue registrado correctamente.',
        );
        this.load(this.editing() ? this.pagination().page : 1);
      },
      error: (error) => {
        this.formFields.set(apiFieldErrors(error));
        this.formError.set(apiErrorMessage(error));
      },
    });
  }

  toggleStatus(resident: ResidentPerson): void {
    const activating = resident.status !== 'ACTIVE';
    if (
      !activating &&
      !window.confirm(
        `¿Desactivar a ${resident.full_name}? Su información se conservará en el sistema.`,
      )
    )
      return;

    this.api.update(resident.id, { status: activating ? 'ACTIVE' : 'INACTIVE' }).subscribe({
      next: () => {
        this.successMessage.set(
          activating
            ? `${resident.full_name} fue reactivado.`
            : `${resident.full_name} fue desactivado.`,
        );
        this.load();
      },
      error: (error) =>
        this.loadError.set(apiErrorMessage(error, 'No pudimos actualizar el estado.')),
    });
  }

  initials(resident: ResidentPerson): string {
    return (
      `${resident.first_name[0] ?? ''}${resident.last_name[0] ?? ''}`.toUpperCase() || 'TJ'
    );
  }
  documentLabel(resident: ResidentPerson): string {
    return resident.document_number
      ? `${resident.document_type} ${resident.document_number}${resident.document_complement ? '-' + resident.document_complement : ''}`
      : 'Sin documento';
  }
  formatDate(value: string | null): string {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }
  statusClass(value: string): string {
    return `status-${value.toLowerCase()}`;
  }

  private clearFormErrors(): void {
    this.formError.set('');
    this.formFields.set({});
  }
}
