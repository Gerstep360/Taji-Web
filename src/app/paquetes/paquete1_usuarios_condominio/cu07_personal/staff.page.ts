import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { StaffApi } from './staff.api';
import { StaffEditorComponent } from './staff-editor.component';
import { StaffListResponse, StaffMember, StaffOptions, StaffPayload } from './staff.models';

const EMPTY_OPTIONS: StaffOptions = {
  staff_types: [],
  statuses: [],
  document_types: [],
};

const EMPTY_PAGINATION: StaffListResponse['pagination'] = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 0,
  next: null,
  previous: null,
};

@Component({
  selector: 'taji-staff-page',
  imports: [ReactiveFormsModule, StaffEditorComponent],
  template: `
    <section class="staff-page" aria-labelledby="staff-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Administración · CU07</span>
          <h2 id="staff-title">Personal del condominio</h2>
          <p>Registra al equipo, gestiona su acceso al sistema y clasifícalo por área de trabajo.</p>
        </div>
        <button class="primary-action" type="button" (click)="openCreate()">
          <span aria-hidden="true">+</span> Nuevo personal
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

      <section class="summary-strip" aria-label="Resumen de personal">
        <div class="summary-number">
          <strong>{{ pagination().total_items }}</strong
          ><span>personas registradas</span>
        </div>
        <div class="area-rail" aria-label="Áreas disponibles">
          @for (area of options().staff_types; track area.value) {
            <span><i [class]="'area-dot ' + areaClass(area.value)"></i>{{ area.label }}</span>
          }
        </div>
      </section>

      <form class="filters" [formGroup]="filters" aria-label="Filtros del personal">
        <label class="search-field">
          <span class="sr-only">Buscar personal</span>
          <span aria-hidden="true">⌕</span>
          <input
            formControlName="search"
            type="search"
            placeholder="Buscar por nombre, CI, teléfono o código"
          />
        </label>
        <label>
          <span>Área</span>
          <select formControlName="staff_type">
            <option value="">Todas las áreas</option>
            @for (area of options().staff_types; track area.value) {
              <option [value]="area.value">{{ area.label }}</option>
            }
          </select>
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
        } @else if (!staff().length) {
          <div class="empty-state">
            <span aria-hidden="true">TJ</span>
            <h3>{{ hasFilters() ? 'No encontramos coincidencias' : 'Tu equipo comienza aquí' }}</h3>
            <p>
              {{
                hasFilters()
                  ? 'Prueba con otro nombre, área o estado.'
                  : 'Registra la primera persona que trabaja en el condominio.'
              }}
            </p>
            @if (!hasFilters()) {
              <button type="button" (click)="openCreate()">Registrar personal</button>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Personal</th>
                  <th>Área</th>
                  <th>Acceso al sistema</th>
                  <th>Contacto</th>
                  <th>Inicio de trabajo</th>
                  <th>Estado</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (member of staff(); track member.id) {
                  <tr>
                    <td>
                      <div class="identity">
                        <span>{{ initials(member) }}</span>
                        <div>
                          <strong>{{ member.full_name }}</strong
                          ><small
                            >{{ member.employee_code || 'Sin código' }} ·
                            {{ documentLabel(member) }}</small
                          >
                        </div>
                      </div>
                    </td>
                    <td data-label="Área">
                      <span class="area-badge"
                        ><i [class]="'area-dot ' + areaClass(member.staff_type)"></i
                        >{{ member.staff_type_display }}</span
                      >
                    </td>
                    <td data-label="Acceso al sistema">
                      @if (member.has_system_access) {
                        <span class="access-pill active" [title]="'Rol: ' + (member.role_name || member.role_slug || 'Seguridad')">
                          CUENTA ACTIVA
                        </span>
                      } @else {
                        <span class="access-pill inactive">Sin acceso</span>
                      }
                    </td>
                    <td data-label="Contacto">
                      <div class="contact">
                        <span>{{ member.phone || 'Sin teléfono' }}</span
                        ><small>{{ member.access_email || member.contact_email || 'Sin correo' }}</small>
                      </div>
                    </td>
                    <td data-label="Inicio de trabajo">{{ formatDate(member.hire_date) }}</td>
                    <td data-label="Estado">
                      <span [class]="'status-badge ' + statusClass(member.status)">{{
                        member.status_display
                      }}</span>
                    </td>
                    <td>
                      <div class="row-actions">
                        @if (member.has_system_access) {
                          <button
                            type="button"
                            class="reset-btn"
                            (click)="openResetPassword(member)"
                            [attr.aria-label]="'Restablecer contraseña de ' + member.full_name"
                          >
                            Clave
                          </button>
                        }
                        <button
                          type="button"
                          (click)="openEdit(member)"
                          [attr.aria-label]="'Editar a ' + member.full_name"
                        >
                          Editar</button
                        ><button
                          class="danger"
                          type="button"
                          (click)="remove(member)"
                          [attr.aria-label]="'Eliminar a ' + member.full_name"
                        >
                          Eliminar
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
      <taji-staff-editor
        [options]="options()"
        [member]="editing()"
        [saving]="saving()"
        [formError]="formError()"
        [fieldErrors]="formFields()"
        (cancelled)="closeEditor()"
        (submitted)="save($event)"
      />
    }

    @if (resetMember()) {
      <div class="modal-backdrop" (click)="closeResetPassword()"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
        <header class="modal-header">
          <h3 id="reset-modal-title">Restablecer contraseña</h3>
          <button type="button" class="close" (click)="closeResetPassword()">×</button>
        </header>
        <p class="modal-subtitle">
          Define una nueva contraseña para <strong>{{ resetMember()?.full_name }}</strong> ({{ resetMember()?.access_email }}).
        </p>

        @if (resetError()) {
          <div class="notice error" role="alert">{{ resetError() }}</div>
        }

        <form [formGroup]="resetForm" (ngSubmit)="submitResetPassword()" novalidate>
          <label class="modal-field">
            <span>Nueva contraseña *</span>
            <input formControlName="password" type="password" autocomplete="new-password" placeholder="••••••••" />
            <small class="error-text">{{ resetFieldError('password') }}</small>
          </label>
          <label class="modal-field">
            <span>Confirmar nueva contraseña *</span>
            <input formControlName="password_confirm" type="password" autocomplete="new-password" placeholder="••••••••" />
            <small class="error-text">{{ resetFieldError('password_confirm') }}</small>
          </label>
          <div class="modal-actions">
            <button type="button" class="secondary" (click)="closeResetPassword()">Cancelar</button>
            <button type="submit" class="primary" [disabled]="resettingPassword()">
              {{ resettingPassword() ? 'Guardando…' : 'Restablecer contraseña' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styleUrl: './staff.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPage implements OnInit {
  private readonly api = inject(StaffApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly staff = signal<StaffMember[]>([]);
  readonly options = signal<StaffOptions>(EMPTY_OPTIONS);
  readonly pagination = signal(EMPTY_PAGINATION);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly formError = signal('');
  readonly formFields = signal<Record<string, string>>({});
  readonly successMessage = signal('');
  readonly editorOpen = signal(false);
  readonly editing = signal<StaffMember | null>(null);

  // Reset password dialog state
  readonly resetMember = signal<StaffMember | null>(null);
  readonly resettingPassword = signal(false);
  readonly resetError = signal('');
  readonly resetFields = signal<Record<string, string>>({});

  readonly filters = this.fb.nonNullable.group({ search: '', staff_type: '', status: '' });

  readonly resetForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirm: ['', [Validators.required]],
  });

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
          this.staff.set(response.results);
          this.pagination.set(response.pagination);
        },
        error: (error) =>
          this.loadError.set(apiErrorMessage(error, 'No pudimos cargar al personal.')),
      });
  }

  loadOptions(): void {
    this.api.options().subscribe({
      next: (options) => this.options.set(options),
      error: (error) =>
        this.loadError.set(apiErrorMessage(error, 'No pudimos cargar las áreas disponibles.')),
    });
  }

  clearFilters(): void {
    this.filters.reset({ search: '', staff_type: '', status: '' });
  }
  changePage(delta: number): void {
    this.load(this.pagination().page + delta);
  }

  openCreate(): void {
    this.editing.set(null);
    this.clearFormErrors();
    this.editorOpen.set(true);
  }

  openEdit(member: StaffMember): void {
    this.editing.set(member);
    this.clearFormErrors();
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }

  save(payload: StaffPayload): void {
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
            ? 'Los datos del personal fueron actualizados.'
            : 'La persona fue registrada en el equipo.',
        );
        this.load(this.editing() ? this.pagination().page : 1);
      },
      error: (error) => {
        this.formFields.set(apiFieldErrors(error));
        this.formError.set(apiErrorMessage(error));
      },
    });
  }

  openResetPassword(member: StaffMember): void {
    this.resetMember.set(member);
    this.resetError.set('');
    this.resetFields.set({});
    this.resetForm.reset();
  }

  closeResetPassword(): void {
    if (!this.resettingPassword()) {
      this.resetMember.set(null);
    }
  }

  submitResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { password, password_confirm } = this.resetForm.getRawValue();
    if (password !== password_confirm) {
      this.resetForm.controls.password_confirm.setErrors({ mismatch: true });
      this.resetForm.markAllAsTouched();
      return;
    }

    const member = this.resetMember();
    if (!member) return;

    this.resettingPassword.set(true);
    this.resetError.set('');
    this.resetFields.set({});

    this.api
      .resetPassword(member.id, { password, password_confirm })
      .pipe(finalize(() => this.resettingPassword.set(false)))
      .subscribe({
        next: () => {
          this.resetMember.set(null);
          this.successMessage.set(`Contraseña restablecida exitosamente para ${member.full_name}.`);
        },
        error: (error) => {
          this.resetFields.set(apiFieldErrors(error));
          this.resetError.set(apiErrorMessage(error, 'No se pudo restablecer la contraseña.'));
        },
      });
  }

  resetFieldError(field: string): string {
    if (this.resetFields()[field]) return this.resetFields()[field];
    const control = this.resetForm.get(field);
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) return 'Debe tener al menos 8 caracteres.';
    if (control.hasError('mismatch')) return 'Las contraseñas no coinciden.';
    return '';
  }

  remove(member: StaffMember): void {
    if (
      !window.confirm(
        `¿Eliminar a ${member.full_name} del personal? Su identidad se conservará en el sistema.`,
      )
    )
      return;
    this.api.delete(member.id).subscribe({
      next: () => {
        this.successMessage.set(`${member.full_name} fue retirado del directorio.`);
        this.load();
      },
      error: (error) =>
        this.loadError.set(apiErrorMessage(error, 'No pudimos eliminar el registro.')),
    });
  }

  initials(member: StaffMember): string {
    return `${member.first_name[0] ?? ''}${member.last_name[0] ?? ''}`.toUpperCase() || 'TJ';
  }
  documentLabel(member: StaffMember): string {
    return member.document_number
      ? `${member.document_type} ${member.document_number}${member.document_complement ? '-' + member.document_complement : ''}`
      : 'Sin documento';
  }
  formatDate(value: string | null): string {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  }
  areaClass(value: string): string {
    return `area-${value.toLowerCase()}`;
  }
  statusClass(value: string): string {
    return `status-${value.toLowerCase()}`;
  }

  private clearFormErrors(): void {
    this.formError.set('');
    this.formFields.set({});
  }
}

