import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Sector, SectorOptions, SectorPayload } from './sector.models';

@Component({
  selector: 'taji-sector-editor',
  imports: [ReactiveFormsModule],
  template: `
    <div class="drawer-backdrop" (click)="cancel()"></div>
    <aside class="editor" role="dialog" aria-modal="true" aria-labelledby="sector-editor-title">
      <header>
        <div>
          <span class="kicker">{{ sector() ? 'Editar sector' : 'Nuevo sector' }}</span>
          <h2 id="sector-editor-title">{{ sector()?.name || 'Agregar sector' }}</h2>
          <p>Define bloques, torres, pisos o zonas del condominio.</p>
        </div>
        <button type="button" class="close" (click)="cancel()" aria-label="Cerrar formulario">×</button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="form-error" role="alert">{{ formError() }}</div>
        }
        <fieldset>
          <legend>Datos del sector</legend>
          <div class="form-grid">
            <label><span>Código *</span><input formControlName="code" /><small>{{ fieldError('code') }}</small></label>
            <label><span>Nombre *</span><input formControlName="name" /><small>{{ fieldError('name') }}</small></label>
            <label>
              <span>Tipo *</span>
              <select formControlName="sector_type">
                @for (type of options().sector_types; track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select>
            </label>
            <label>
              <span>Sector padre <em>(opcional)</em></span>
              <select formControlName="parent">
                <option [ngValue]="null">Sin padre (nivel superior)</option>
                @for (candidate of availableParents(); track candidate.id) {
                  <option [ngValue]="candidate.id">{{ candidate.code }} · {{ candidate.name }}</option>
                }
              </select>
              <small>{{ fieldError('parent') }}</small>
            </label>
            <label class="wide"><span>Descripción</span><textarea formControlName="description" rows="2"></textarea></label>
            <label class="checkbox"><input type="checkbox" formControlName="is_active" /><span>Activo</span></label>
          </div>
        </fieldset>
        <footer>
          <button type="button" class="secondary" (click)="cancel()">Cancelar</button>
          <button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : sector() ? 'Guardar cambios' : 'Registrar sector' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
  styleUrl: './sector-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectorEditorComponent {
  private readonly fb = inject(FormBuilder);
  readonly options = input.required<SectorOptions>();
  readonly sector = input<Sector | null>(null);
  readonly sectors = input<Sector[]>([]);
  readonly saving = input(false);
  readonly formError = input('');
  readonly fieldErrors = input<Record<string, string>>({});
  readonly cancelled = output<void>();
  readonly submitted = output<SectorPayload>();

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sector_type: ['SECTOR', Validators.required],
    parent: this.fb.control<number | null>(null),
    description: [''],
    is_active: [true],
  });

  constructor() {
    effect(() => this.populate(this.sector(), this.options()));
  }

  availableParents(): Sector[] {
    const current = this.sector();
    return this.sectors().filter((candidate) => candidate.id !== current?.id);
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

  private populate(sector: Sector | null, options: SectorOptions): void {
    this.form.reset({
      code: sector?.code ?? '',
      name: sector?.name ?? '',
      sector_type: sector?.sector_type ?? options.sector_types[0]?.value ?? 'SECTOR',
      parent: sector?.parent ?? null,
      description: sector?.description ?? '',
      is_active: sector?.is_active ?? true,
    });
  }
}