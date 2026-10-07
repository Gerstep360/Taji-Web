import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { StaffMember, StaffOptions, StaffPayload } from './staff.models';

@Component({
  selector: 'taji-staff-editor',
  imports: [ReactiveFormsModule],
  template: `
    <div class="drawer-backdrop" (click)="cancel()"></div>
    <aside class="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header>
        <div>
          <span class="kicker">{{ member() ? 'Editar registro' : 'Nuevo registro' }}</span>
          <h2 id="editor-title">{{ member()?.full_name || 'Agregar personal' }}</h2>
          <p>Los datos personales, laborales y de acceso se guardan juntos.</p>
        </div>
        <button type="button" class="close" (click)="cancel()" aria-label="Cerrar formulario">
          ×
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="form-error" role="alert">{{ formError() }}</div>
        }

        <fieldset>
          <legend>Identidad</legend>
          <div class="form-grid">
            <label
              ><span>Nombres *</span
              ><input formControlName="first_name" autocomplete="given-name" /><small>{{
                fieldError('first_name')
              }}</small></label
            >
            <label
              ><span>Apellidos *</span
              ><input formControlName="last_name" autocomplete="family-name" /><small>{{
                fieldError('last_name')
              }}</small></label
            >
            <label
              ><span>Tipo de documento</span
              ><select formControlName="document_type">
                @for (type of options().document_types; track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select></label
            >
            <label
              ><span>Número de documento</span
              ><input formControlName="document_number" inputmode="numeric" /><small>{{
                fieldError('document_number')
              }}</small></label
            >
            <label
              ><span>Complemento</span><input formControlName="document_complement" maxlength="10"
            /></label>
            <label
              ><span>Fecha de nacimiento</span><input formControlName="birth_date" type="date"
            /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Contacto</legend>
          <div class="form-grid">
            <label
              ><span>Teléfono</span><input formControlName="phone" type="tel" autocomplete="tel"
            /></label>
            <label
              ><span>Correo</span
              ><input formControlName="contact_email" type="email" autocomplete="email" /><small>{{
                fieldError('contact_email')
              }}</small></label
            >
          </div>
        </fieldset>

        <fieldset>
          <legend>Información laboral</legend>
          <div class="system-code" aria-live="polite">
            <span>Código del sistema</span>
            <strong>{{ member()?.employee_code || 'Se asignará al registrar' }}</strong>
            <small>Identifica a esta persona aunque cambie de área.</small>
          </div>
          <div class="form-grid">
            <label
              ><span>Área *</span
              ><select formControlName="staff_type">
                @for (area of options().staff_types; track area.value) {
                  <option [value]="area.value">{{ area.label }}</option>
                }
              </select></label
            >
            <label
              ><span>Estado</span
              ><select formControlName="status">
                @for (status of options().statuses; track status.value) {
                  <option [value]="status.value">{{ status.label }}</option>
                }
              </select></label
            >
            <label
              ><span>Inicio de trabajo <em>(opcional)</em></span
              ><input formControlName="hire_date" type="date" /><small class="hint"
                >Primer día de trabajo en el condominio.</small
              ></label
            >
            @if (selectedStatus() === 'INACTIVE') {
              <label
                ><span>Fin de trabajo <em>(opcional)</em></span
                ><input formControlName="end_date" type="date" /><small
                  [class.hint]="!fieldError('end_date')"
                  >{{ fieldError('end_date') || 'Último día que trabajó en el condominio.' }}</small
                ></label
              >
            }
            <label class="wide"
              ><span>Notas internas</span
              ><textarea
                formControlName="notes"
                rows="3"
                placeholder="Turno, responsabilidades o información útil"
              ></textarea>
            </label>
          </div>
        </fieldset>

        <fieldset class="access-fieldset">
          <legend>Acceso al sistema</legend>

          @if (member()?.has_system_access) {
            <div class="access-active-card">
              <div class="badge-status-row">
                <span class="access-badge active">CUENTA ACTIVA DE USUARIO</span>
                <span class="role-chip">{{ member()?.role_name || member()?.role_slug || 'Seguridad' }}</span>
              </div>
              <p class="access-email-text">
                <strong>Email de inicio de sesión:</strong> {{ member()?.access_email }}
              </p>
              <label class="toggle-checkbox-label">
                <input type="checkbox" formControlName="toggle_access" />
                <span>Permitir acceso al sistema (Cuenta activa)</span>
              </label>
            </div>
          } @else {
            <div class="access-toggle-box">
              <label class="checkbox-container">
                <input type="checkbox" formControlName="create_system_access" />
                <span class="checkbox-title">Crear / habilitar acceso al sistema</span>
              </label>
              <p class="access-hint">
                Requerido para el personal de <strong>SEGURIDAD</strong> para poder iniciar sesión y utilizar el módulo CU13 (Turnos de Seguridad).
              </p>
            </div>

            @if (selectedCreateAccess()) {
              <div class="form-grid access-form-grid">
                <label class="wide">
                  <span>Correo de acceso *</span>
                  <input formControlName="access_email" type="email" autocomplete="email" placeholder="pepe@taji.com" />
                  <small>{{ fieldError('access_email') }}</small>
                </label>

                <label>
                  <span>Rol de acceso</span>
                  <select formControlName="access_role">
                    <option value="seguridad">Seguridad / Guardia</option>
                    <option value="administrador">Administración</option>
                    <option value="residente">Residente</option>
                  </select>
                  <small class="hint">Rol asignado al usuario en el sistema.</small>
                </label>

                <label>
                  <span>Contraseña *</span>
                  <input formControlName="password" type="password" autocomplete="new-password" placeholder="••••••••" />
                  <small>{{ fieldError('password') }}</small>
                </label>

                <label>
                  <span>Confirmar contraseña *</span>
                  <input formControlName="password_confirm" type="password" autocomplete="new-password" placeholder="••••••••" />
                  <small>{{ fieldError('password_confirm') }}</small>
                </label>
              </div>
            }
          }
        </fieldset>

        <footer>
          <button type="button" class="secondary" (click)="cancel()">Cancelar</button>
          <button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : member() ? 'Guardar cambios' : 'Registrar personal' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
  styleUrl: './staff-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffEditorComponent {
  private readonly fb = inject(FormBuilder);
  readonly options = input.required<StaffOptions>();
  readonly member = input<StaffMember | null>(null);
  readonly saving = input(false);
  readonly formError = input('');
  readonly fieldErrors = input<Record<string, string>>({});
  readonly cancelled = output<void>();
  readonly submitted = output<StaffPayload>();

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(120)]],
    document_type: ['CI', Validators.required],
    document_number: [''],
    document_complement: [''],
    phone: [''],
    contact_email: ['', Validators.email],
    birth_date: [''],
    create_user_account: [false],
    account_password: [''],
    staff_type: ['', Validators.required],
    hire_date: [''],
    end_date: [''],
    status: ['ACTIVE', Validators.required],
    notes: [''],

    // Campos de Acceso al Sistema
    create_system_access: [false],
    access_email: ['', [Validators.email]],
    access_role: ['seguridad'],
    password: [''],
    password_confirm: [''],
    toggle_access: [true],
  });

  readonly selectedStatus = toSignal(this.form.controls.status.valueChanges, {
    initialValue: 'ACTIVE',
  });
  readonly createUserAccount = toSignal(this.form.controls.create_user_account.valueChanges, {
    initialValue: false,
  });

  readonly selectedCreateAccess = toSignal(this.form.controls.create_system_access.valueChanges, {
    initialValue: false,
  });

  readonly selectedStaffType = toSignal(this.form.controls.staff_type.valueChanges, {
    initialValue: '',
  });

  constructor() {
    effect(() => this.populate(this.member(), this.options()));

    effect(() => {
      const area = this.selectedStaffType();
      if (area === 'SECURITY') {
        this.form.controls.access_role.setValue('seguridad');
      }
    });

    effect(() => {
      const createAccess = this.selectedCreateAccess();
      if (createAccess && !this.form.controls.access_email.value) {
        const contactEmail = this.form.controls.contact_email.value;
        if (contactEmail) {
          this.form.controls.access_email.setValue(contactEmail);
        }
      }
    });
  }

  cancel(): void {
    if (!this.saving()) this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    if (!this.member()?.has_system_access && raw.create_system_access) {
      if (!raw.password) {
        this.form.controls.password.setErrors({ required: true });
        this.form.markAllAsTouched();
        return;
      }
      if (raw.password !== raw.password_confirm) {
        this.form.controls.password_confirm.setErrors({ mismatch: true });
        this.form.markAllAsTouched();
        return;
      }
    }
    const createAccess = raw.create_system_access;
    this.submitted.emit({
      first_name: raw.first_name,
      last_name: raw.last_name,
      document_type: raw.document_type,
      document_number: raw.document_number.trim() || null,
      document_complement: raw.document_complement,
      phone: raw.phone,
      contact_email: raw.contact_email,
      birth_date: raw.birth_date || null,
      staff_type: raw.staff_type,
      hire_date: raw.hire_date || null,
      end_date: raw.status === 'INACTIVE' ? raw.end_date || null : null,
      status: raw.status,
      notes: raw.notes,
      create_user_account: createAccess,
      account_password: createAccess ? raw.password : undefined,
      create_system_access: createAccess,
      access_email: createAccess ? raw.access_email : (raw.access_email || undefined),
      access_role: createAccess ? raw.access_role : undefined,
      password: createAccess ? raw.password : undefined,
      password_confirm: createAccess ? raw.password_confirm : undefined,
      toggle_access: this.member()?.has_system_access ? raw.toggle_access : undefined,
    });
  }

  fieldError(field: string): string {
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Este dato es obligatorio.';
    if (control.hasError('email')) return 'Ingresa un correo válido.';
    if (control.hasError('mismatch')) return 'Las contraseñas no coinciden.';
    return '';
  }

  private populate(member: StaffMember | null, options: StaffOptions): void {
    const defaultStaffType = member?.staff_type ?? options.staff_types[0]?.value ?? '';
    const defaultRole = member?.role_slug ?? (defaultStaffType === 'SECURITY' ? 'seguridad' : 'seguridad');

    this.form.reset({
      first_name: member?.first_name ?? '',
      last_name: member?.last_name ?? '',
      document_type: member?.document_type ?? options.document_types[0]?.value ?? 'CI',
      document_number: member?.document_number ?? '',
      document_complement: member?.document_complement ?? '',
      phone: member?.phone ?? '',
      contact_email: member?.contact_email ?? '',
      birth_date: member?.birth_date ?? '',
      create_user_account: false,
      account_password: '',
      staff_type: defaultStaffType,
      hire_date: member?.hire_date ?? '',
      end_date: member?.end_date ?? '',
      status: member?.status ?? options.statuses[0]?.value ?? 'ACTIVE',
      notes: member?.notes ?? '',
      create_system_access: false,
      access_email: member?.access_email ?? member?.contact_email ?? '',
      access_role: defaultRole,
      password: '',
      password_confirm: '',
      toggle_access: member?.user_is_active ?? true,
    });
  }
}

