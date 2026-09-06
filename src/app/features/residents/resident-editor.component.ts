import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ResidentOptions, ResidentPayload, ResidentPerson } from './resident.models';

@Component({
  selector: 'taji-resident-editor',
  imports: [ReactiveFormsModule],
  template: `
    <div class="drawer-backdrop" (click)="cancel()"></div>
    <aside class="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header>
        <div>
          <span class="kicker">{{ resident() ? 'Editar registro' : 'Nuevo registro' }}</span>
          <h2 id="editor-title">{{ resident()?.full_name || 'Agregar residente' }}</h2>
          <p>Los datos personales y del residente se guardan juntos.</p>
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
          <legend>Condición en el condominio</legend>
          <div class="form-grid">
            <label
              ><span>Estado</span
              ><select formControlName="status">
                @for (status of options().statuses; track status.value) {
                  <option [value]="status.value">{{ status.label }}</option>
                }
              </select></label
            >
            <label class="wide"
              ><span>Notas internas</span
              ><textarea
                formControlName="notes"
                rows="3"
                placeholder="Observaciones sobre este residente o copropietario"
              ></textarea>
            </label>
          </div>
        </fieldset>

        <footer>
          <button type="button" class="secondary" (click)="cancel()">Cancelar</button>
          <button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : resident() ? 'Guardar cambios' : 'Registrar residente' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
  styleUrl: './resident-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentEditorComponent {
  private readonly fb = inject(FormBuilder);
  readonly options = input.required<ResidentOptions>();
  readonly resident = input<ResidentPerson | null>(null);
  readonly saving = input(false);
  readonly formError = input('');
  readonly fieldErrors = input<Record<string, string>>({});
  readonly cancelled = output<void>();
  readonly submitted = output<ResidentPayload>();

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(120)]],
    document_type: ['CI', Validators.required],
    document_number: [''],
    document_complement: [''],
    phone: [''],
    contact_email: ['', Validators.email],
    birth_date: [''],
    status: ['ACTIVE', Validators.required],
    notes: [''],
  });

  constructor() {
    effect(() => this.populate(this.resident(), this.options()));
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

  private populate(resident: ResidentPerson | null, options: ResidentOptions): void {
    this.form.reset({
      first_name: resident?.first_name ?? '',
      last_name: resident?.last_name ?? '',
      document_type: resident?.document_type ?? options.document_types[0]?.value ?? 'CI',
      document_number: resident?.document_number ?? '',
      document_complement: resident?.document_complement ?? '',
      phone: resident?.phone ?? '',
      contact_email: resident?.contact_email ?? '',
      birth_date: resident?.birth_date ?? '',
      status: resident?.status ?? options.statuses[0]?.value ?? 'ACTIVE',
      notes: resident?.notes ?? '',
    });
  }
}
