import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { apiErrorMessage } from '../../../core/api-error';
import { ResidentesUnidadesApi } from './residentes-unidades.api';
import {
  RelationType,
  ResidentOption,
  ResidentUnitLink,
  ResidentUnitPayload,
  UnitOption,
} from './residentes-unidades.models';

const RELATIONS: { value: RelationType; label: string }[] = [
  { value: 'OWNER', label: 'Propietario' },
  { value: 'TENANT', label: 'Inquilino' },
  { value: 'FAMILY', label: 'Familiar' },
  { value: 'AUTHORIZED', label: 'Autorizado' },
  { value: 'OTHER', label: 'Otro' },
];

@Component({
  selector: 'taji-residentes-unidades-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page" aria-labelledby="page-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Administración · CU06</span>
          <h2 id="page-title">Residentes y Copropietarios</h2>
          <p>Asocia residentes con unidades y conserva el historial de ocupación.</p>
        </div>
        <button class="primary-action" type="button" (click)="openCreate()">
          <span aria-hidden="true">+</span> Nueva asociación
        </button>
      </header>

      @if (successMessage()) { <div class="notice success" role="status">✓ {{ successMessage() }}</div> }
      @if (errorMessage()) { <div class="notice error" role="alert">{{ errorMessage() }}</div> }

      <div class="toolbar">
        <label class="search-field">
          <span class="sr-only">Buscar asociaciones</span>
          <input type="search" [formControl]="searchControl" placeholder="Buscar por residente o unidad" />
        </label>
        <label>
          <span>Mostrar</span>
          <select [value]="filter()" (change)="setFilter($any($event.target).value)">
            <option value="true">Activas</option>
            <option value="all">Todo el historial</option>
            <option value="false">Finalizadas</option>
          </select>
        </label>
      </div>

      <div class="summary-grid" aria-label="Resumen de asociaciones">
        <div class="summary"><strong>{{ residents().length }}</strong><span>Residentes disponibles</span></div>
        <div class="summary"><strong>{{ units().length }}</strong><span>Unidades disponibles</span></div>
        <div class="summary"><strong>{{ visibleLinks().length }}</strong><span>Asociaciones mostradas</span></div>
      </div>

      <div class="table-wrap" [attr.aria-busy]="loading()">
        @if (loading()) {
          <p class="loading-state">Actualizando asociaciones…</p>
        } @else if (!visibleLinks().length) {
          <div class="empty-state"><h3>No hay asociaciones</h3><p>Crea la primera relación entre un residente y una unidad.</p></div>
        } @else {
          <table>
            <thead><tr><th>Residente</th><th>Unidad</th><th>Relación</th><th>Desde</th><th>Hasta</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              @for (link of visibleLinks(); track link.id) {
                <tr>
                  <td data-label="Residente">{{ link.resident_name }}</td>
                  <td data-label="Unidad">{{ link.unit_code }}</td>
                  <td data-label="Relación">{{ link.relation_type_display }}{{ link.is_primary ? ' · Principal' : '' }}</td>
                  <td data-label="Desde">{{ link.start_date }}</td>
                  <td data-label="Hasta">{{ link.end_date || '—' }}</td>
                  <td data-label="Estado"><span class="status" [class.closed]="link.end_date">{{ link.end_date ? 'Finalizada' : 'Activa' }}</span></td>
                  <td class="actions">
                    @if (!link.end_date) { <button type="button" (click)="finish(link)">Finalizar</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </section>

    @if (editorOpen()) {
      <div class="backdrop" role="presentation" (click)="closeEditor()">
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" (click)="$event.stopPropagation()">
          <header><div><span class="kicker">CU06 · Historial</span><h2 id="dialog-title">Nueva asociación</h2></div><button class="close" type="button" aria-label="Cerrar" (click)="closeEditor()">×</button></header>
          @if (formError()) { <div class="notice error" role="alert">{{ formError() }}</div> }
          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            <label><span>Residente</span><select formControlName="resident"><option value="">Selecciona un residente</option>@for (item of residents(); track item.id) { <option [value]="item.id">{{ item.full_name }}{{ item.document_number ? ' · ' + item.document_number : '' }}</option> }</select></label>
            <label><span>Unidad habitacional</span><select formControlName="unit"><option value="">Selecciona una unidad</option>@for (item of units(); track item.id) { <option [value]="item.id">{{ item.code }} · {{ item.unit_type_display }}</option> }</select></label>
            <label><span>Tipo de relación</span><select formControlName="relation_type">@for (relation of relations; track relation.value) { <option [value]="relation.value">{{ relation.label }}</option> }</select></label>
            <div class="form-grid"><label><span>Fecha de inicio</span><input type="date" formControlName="start_date" /></label><label class="check"><input type="checkbox" formControlName="is_primary" /><span>Unidad principal</span></label></div>
            <footer><button type="button" class="secondary" (click)="closeEditor()">Cancelar</button><button class="primary-action" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar asociación' }}</button></footer>
          </form>
        </section>
      </div>
    }
  `,
  styleUrl: './residentes-unidades.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentesUnidadesPage implements OnInit {
  private readonly api = inject(ResidentesUnidadesApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly relations = RELATIONS;
  readonly residents = signal<ResidentOption[]>([]);
  readonly units = signal<UnitOption[]>([]);
  readonly links = signal<ResidentUnitLink[]>([]);
  readonly visibleLinks = signal<ResidentUnitLink[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editorOpen = signal(false);
  readonly filter = signal<'all' | 'true' | 'false'>('true');
  readonly errorMessage = signal('');
  readonly formError = signal('');
  readonly successMessage = signal('');
  readonly searchControl = this.fb.nonNullable.control('');
  readonly form = this.fb.nonNullable.group({
    resident: ['', Validators.required],
    unit: ['', Validators.required],
    relation_type: ['OWNER' as RelationType, Validators.required],
    start_date: [new Date().toISOString().slice(0, 10), Validators.required],
    is_primary: false,
  });

  constructor() {
    this.searchControl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.applySearch(value));
  }

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadLinks();
  }

  openCreate(): void { this.form.reset({ resident: '', unit: '', relation_type: 'OWNER', start_date: new Date().toISOString().slice(0, 10), is_primary: false }); this.formError.set(''); this.editorOpen.set(true); }
  closeEditor(): void { if (!this.saving()) this.editorOpen.set(false); }
  setFilter(value: 'all' | 'true' | 'false'): void { this.filter.set(value); this.loadLinks(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const values = this.form.getRawValue();
    const payload: ResidentUnitPayload = { ...values, resident: Number(values.resident), unit: Number(values.unit) };
    this.api.create(payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.editorOpen.set(false); this.successMessage.set('La asociación fue guardada correctamente.'); this.loadLinks(); },
      error: (error) => this.formError.set(apiErrorMessage(error, 'No se pudo guardar la asociación.')),
    });
  }

  finish(link: ResidentUnitLink): void {
    const endDate = window.prompt(`Fecha de finalización para ${link.resident_name} (${link.unit_code})`, new Date().toISOString().slice(0, 10));
    if (!endDate) return;
    this.api.update(link.id, { end_date: endDate }).subscribe({
      next: () => { this.successMessage.set('La asociación fue finalizada y conservada en el historial.'); this.loadLinks(); },
      error: (error) => this.errorMessage.set(apiErrorMessage(error, 'No se pudo finalizar la asociación.')),
    });
  }

  private loadCatalogs(): void {
    this.api.residents().subscribe({ next: (response) => this.residents.set(response.results), error: (error) => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar los residentes.')) });
    this.api.units().subscribe({ next: (response) => this.units.set(response.results), error: (error) => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar las unidades.')) });
  }

  private loadLinks(): void {
    this.loading.set(true); this.errorMessage.set('');
    this.api.links(this.filter()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => { this.links.set(response.results); this.applySearch(this.searchControl.value); },
      error: (error) => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar las asociaciones.')),
    });
  }

  private applySearch(search: string): void {
    const value = search.trim().toLowerCase();
    this.visibleLinks.set(!value ? this.links() : this.links().filter((link) => `${link.resident_name} ${link.unit_code} ${link.relation_type_display}`.toLowerCase().includes(value)));
  }
}
