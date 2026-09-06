import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Sector } from './sector.models';
import { Unit, UnitOptions, UnitPayload } from './unit.models';

@Component({
  selector: 'taji-unit-editor',
  imports: [ReactiveFormsModule],
  template: `
    <div class="drawer-backdrop" (click)="cancel()"></div>
    <aside class="editor" role="dialog" aria-modal="true" aria-labelledby="unit-editor-title">
      <header>
        <div>
          <span class="kicker">{{ unit() ? 'Editar unidad' : 'Nueva unidad' }}</span>
          <h2 id="unit-editor-title">{{ unit()?.code || 'Agregar unidad' }}</h2>
          <p>Registra una unidad habitacional y ubícala dentro de un sector.</p>
        </div>
        <button type="button" class="close" (click)="cancel()" aria-label="Cerrar formulario">×</button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="form-error" role="alert">{{ formError() }}</div>
        }
        <fieldset>
          <legend>Datos de la unidad</legend>
          <div class="form-grid">
            <label><span>Código *</span><input formControlName="code" /><small>{{ fieldError('code') }}</small></label>
            <label>
              <span>Tipo *</span>
              <select formControlName="unit_type">
                @for (type of options().unit_types; track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select>
            </label>
            <label>
              <span>Sector <em>(opcional)</em></span>
              <select formControlName="sector">
                <option [ngValue]="null">Sin sector asignado</option>
                @for (candidate of sectors(); track candidate.id) {
                  <option [ngValue]="candidate.id">{{ candidate.code }} · {{ candidate.name }}</option>
                }
              </select>
            </label>
            <label><span>Piso <em>(opcional)</em></span><input formControlName="floor_label" /></label>
            <label>
              <span>Estado</span>
              <select formControlName="status">
                @for (s of options().statuses; track s.value) {
                  <option [value]="s.value">{{ s.label }}</option>
                }
              </select>
            </label>
            <label class="wide"><span>Descripción</span><textarea formControlName="description" rows="2"></textarea></label>
          </div>
        </fieldset>
        <footer>
          <button type="button" class="secondary" (click)="cancel()">Cancelar</button>
          <button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : unit() ? 'Guardar cambios' : 'Registrar unidad' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
  styleUrl: './unit-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitEditorComponent {
  private readonly fb = inject(FormBuilder);
  readonly options = input.required<UnitOptions>();
  readonly unit = input<Unit | null>(null);
  readonly sectors = input<Sector[]>([]);
  readonly saving = input(false);
  readonly formError = input('');
  readonly fieldErrors = input<Record<string, string>>({});
  readonly cancelled = output<void>();
  readonly submitted = output<UnitPayload>();

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    unit_type: ['APARTMENT', Validators.required],
    sector: this.fb.control<number | null>(null),
    floor_label: [''],
    description: [''],
    status: ['ACTIVE', Validators.required],
  });

  constructor() {
    effect(() => this.populate(this.unit(), this.options()));
  }

  cancel(): void {
    if (!this.saving()) this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }

  fieldError(field: string): string {
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Este dato es obligatorio.';
    return '';
  }

  private populate(unit: Unit | null, options: UnitOptions): void {
    this.form.reset({
      code: unit?.code ?? '',
      unit_type: unit?.unit_type ?? options.unit_types[0]?.value ?? 'APARTMENT',
      sector: unit?.sector ?? null,
      floor_label: unit?.floor_label ?? '',
      description: unit?.description ?? '',
      status: unit?.status ?? 'ACTIVE',
    });
  }
}