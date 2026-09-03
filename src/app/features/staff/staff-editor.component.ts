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
          <p>Los datos personales y laborales se guardan juntos.</p>
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
    staff_type: ['', Validators.required],
    hire_date: [''],
    end_date: [''],
    status: ['ACTIVE', Validators.required],
    notes: [''],
  });

  readonly selectedStatus = toSignal(this.form.controls.status.valueChanges, {
    initialValue: 'ACTIVE',
  });

  constructor() {
    effect(() => this.populate(this.member(), this.options()));
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
    this.submitted.emit({
      ...raw,
      document_number: raw.document_number.trim() || null,
      birth_date: raw.birth_date || null,
      hire_date: raw.hire_date || null,
      end_date: raw.status === 'INACTIVE' ? raw.end_date || null : null,
    });
  }

  fieldError(field: string): string {
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Este dato es obligatorio.';
    if (control.hasError('email')) return 'Ingresa un correo válido.';
    return '';
  }

  private populate(member: StaffMember | null, options: StaffOptions): void {
    this.form.reset({
      first_name: member?.first_name ?? '',
      last_name: member?.last_name ?? '',
      document_type: member?.document_type ?? options.document_types[0]?.value ?? 'CI',
      document_number: member?.document_number ?? '',
      document_complement: member?.document_complement ?? '',
      phone: member?.phone ?? '',
      contact_email: member?.contact_email ?? '',
      birth_date: member?.birth_date ?? '',
      staff_type: member?.staff_type ?? options.staff_types[0]?.value ?? '',
      hire_date: member?.hire_date ?? '',
      end_date: member?.end_date ?? '',
      status: member?.status ?? options.statuses[0]?.value ?? 'ACTIVE',
      notes: member?.notes ?? '',
    });
  }
}
