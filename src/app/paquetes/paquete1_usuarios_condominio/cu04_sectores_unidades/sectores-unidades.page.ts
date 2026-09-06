import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { SectorApi } from './sector.api';
import { SectorEditorComponent } from './sector-editor.component';
import { Sector, SectorListResponse, SectorOptions, SectorPayload } from './sector.models';
import { UnitApi } from './unit.api';
import { UnitEditorComponent } from './unit-editor.component';
import { Unit, UnitListResponse, UnitOptions, UnitPayload } from './unit.models';

type TabId = 'sectores' | 'unidades';

const EMPTY_SECTOR_OPTIONS: SectorOptions = { sector_types: [] };
const EMPTY_UNIT_OPTIONS: UnitOptions = { unit_types: [], statuses: [] };
const EMPTY_PAGINATION: SectorListResponse['pagination'] = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 0,
  next: null,
  previous: null,
};

@Component({
  selector: 'taji-sectores-unidades-page',
  imports: [ReactiveFormsModule, SectorEditorComponent, UnitEditorComponent],
  template: `
    <section class="page" aria-labelledby="page-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Administración · CU04</span>
          <h2 id="page-title">Sectores y Unidades</h2>
          <p>Organiza la estructura física del condominio y sus unidades habitacionales.</p>
        </div>
        <button class="primary-action" type="button" (click)="activeTab() === 'sectores' ? openCreateSector() : openCreateUnit()">
          <span aria-hidden="true">+</span> {{ activeTab() === 'sectores' ? 'Nuevo sector' : 'Nueva unidad' }}
        </button>
      </header>

      @if (successMessage()) {
        <div class="notice success" role="status"><span aria-hidden="true">✓</span>{{ successMessage() }}</div>
      }
      @if (loadError()) {
        <div class="notice error" role="alert"><span>{{ loadError() }}</span></div>
      }

      <div class="tabs" role="tablist">
        <button role="tab" type="button" [class.active]="activeTab() === 'sectores'" (click)="selectTab('sectores')">
          Sectores
        </button>
        <button role="tab" type="button" [class.active]="activeTab() === 'unidades'" (click)="selectTab('unidades')">
          Unidades
        </button>
      </div>

      @if (activeTab() === 'sectores') {
        <form class="filters" [formGroup]="sectorFilters" aria-label="Filtros de sectores">
          <label class="search-field">
            <span class="sr-only">Buscar sector</span>
            <input formControlName="search" type="search" placeholder="Buscar por código o nombre" />
          </label>
          <label>
            <span>Tipo</span>
            <select formControlName="sector_type">
              <option value="">Todos los tipos</option>
              @for (type of sectorOptions().sector_types; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </label>
        </form>

        <div class="table-wrap" [attr.aria-busy]="sectorsLoading()">
          @if (sectorsLoading()) {
            <p class="loading-state">Actualizando sectores…</p>
          } @else if (!sectors().length) {
            <div class="empty-state"><p>No hay sectores registrados todavía.</p></div>
          } @else {
            <table>
              <thead>
                <tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Padre</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                @for (item of sectors(); track item.id) {
                  <tr>
                    <td>{{ item.code }}</td>
                    <td>{{ item.name }}</td>
                    <td>{{ item.sector_type_display }}</td>
                    <td>{{ item.parent_name || '—' }}</td>
                    <td>{{ item.is_active ? 'Activo' : 'Inactivo' }}</td>
                    <td>
                      <button type="button" (click)="openEditSector(item)">Editar</button>
                      <button class="danger" type="button" (click)="removeSector(item)">Eliminar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      } @else {
        <form class="filters" [formGroup]="unitFilters" aria-label="Filtros de unidades">
          <label class="search-field">
            <span class="sr-only">Buscar unidad</span>
            <input formControlName="search" type="search" placeholder="Buscar por código" />
          </label>
          <label>
            <span>Sector</span>
            <select formControlName="sector">
              <option value="">Todos los sectores</option>
              @for (item of allSectors(); track item.id) {
                <option [value]="item.id">{{ item.code }} · {{ item.name }}</option>
              }
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select formControlName="status">
              <option value="">Todos los estados</option>
              @for (s of unitOptions().statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </label>
        </form>

        <div class="table-wrap" [attr.aria-busy]="unitsLoading()">
          @if (unitsLoading()) {
            <p class="loading-state">Actualizando unidades…</p>
          } @else if (!units().length) {
            <div class="empty-state"><p>No hay unidades registradas todavía.</p></div>
          } @else {
            <table>
              <thead>
                <tr><th>Código</th><th>Tipo</th><th>Sector</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                @for (item of units(); track item.id) {
                  <tr>
                    <td>{{ item.code }}</td>
                    <td>{{ item.unit_type_display }}</td>
                    <td>{{ item.sector_name || '—' }}</td>
                    <td>{{ item.status_display }}</td>
                    <td>
                      <button type="button" (click)="openEditUnit(item)">Editar</button>
                      <button class="danger" type="button" (click)="removeUnit(item)">Eliminar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </section>

    @if (sectorEditorOpen()) {
      <taji-sector-editor
        [options]="sectorOptions()"
        [sector]="editingSector()"
        [sectors]="allSectors()"
        [saving]="saving()"
        [formError]="formError()"
        [fieldErrors]="formFields()"
        (cancelled)="closeSectorEditor()"
        (submitted)="saveSector($event)"
      />
    }
    @if (unitEditorOpen()) {
      <taji-unit-editor
        [options]="unitOptions()"
        [unit]="editingUnit()"
        [sectors]="allSectors()"
        [saving]="saving()"
        [formError]="formError()"
        [fieldErrors]="formFields()"
        (cancelled)="closeUnitEditor()"
        (submitted)="saveUnit($event)"
      />
    }
  `,
  styleUrl: './sectores-unidades.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectoresUnidadesPage implements OnInit {
  private readonly sectorApi = inject(SectorApi);
  private readonly unitApi = inject(UnitApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<TabId>('sectores');

  readonly sectors = signal<Sector[]>([]);
  readonly sectorsPagination = signal(EMPTY_PAGINATION);
  readonly sectorsLoading = signal(true);
  readonly sectorOptions = signal<SectorOptions>(EMPTY_SECTOR_OPTIONS);
  readonly allSectors = signal<Sector[]>([]);

  readonly units = signal<Unit[]>([]);
  readonly unitsPagination = signal(EMPTY_PAGINATION);
  readonly unitsLoading = signal(true);
  readonly unitOptions = signal<UnitOptions>(EMPTY_UNIT_OPTIONS);

  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly formError = signal('');
  readonly formFields = signal<Record<string, string>>({});
  readonly successMessage = signal('');

  readonly sectorEditorOpen = signal(false);
  readonly editingSector = signal<Sector | null>(null);
  readonly unitEditorOpen = signal(false);
  readonly editingUnit = signal<Unit | null>(null);

  readonly sectorFilters = this.fb.nonNullable.group({ search: '', sector_type: '' });
  readonly unitFilters = this.fb.nonNullable.group({ search: '', sector: '', status: '' });

  constructor() {
    this.sectorFilters.valueChanges
      .pipe(debounceTime(280), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSectors(1));
    this.unitFilters.valueChanges
      .pipe(debounceTime(280), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadUnits(1));
  }

  ngOnInit(): void {
    this.sectorApi.options().subscribe({ next: (o) => this.sectorOptions.set(o) });
    this.unitApi.options().subscribe({ next: (o) => this.unitOptions.set(o) });
    this.loadAllSectors();
    this.loadSectors();
    this.loadUnits();
  }

  selectTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  loadAllSectors(): void {
    this.sectorApi.list({ page: 1, page_size: 100 }).subscribe({
      next: (response) => this.allSectors.set(response.results),
    });
  }

  loadSectors(page = this.sectorsPagination().page): void {
    const filters = this.sectorFilters.getRawValue();
    this.sectorsLoading.set(true);
    this.sectorApi
      .list({ page, page_size: 10, ...filters })
      .pipe(finalize(() => this.sectorsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.sectors.set(response.results);
          this.sectorsPagination.set(response.pagination);
        },
        error: (error) => this.loadError.set(apiErrorMessage(error, 'No pudimos cargar los sectores.')),
      });
  }

  loadUnits(page = this.unitsPagination().page): void {
    const filters = this.unitFilters.getRawValue();
    this.unitsLoading.set(true);
    this.unitApi
      .list({
        page,
        page_size: 10,
        search: filters.search,
        sector: filters.sector ? Number(filters.sector) : undefined,
        status: filters.status,
      })
      .pipe(finalize(() => this.unitsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.units.set(response.results);
          this.unitsPagination.set(response.pagination);
        },
        error: (error) => this.loadError.set(apiErrorMessage(error, 'No pudimos cargar las unidades.')),
      });
  }

  openCreateSector(): void {
    this.editingSector.set(null);
    this.clearFormErrors();
    this.sectorEditorOpen.set(true);
  }
  openEditSector(sector: Sector): void {
    this.editingSector.set(sector);
    this.clearFormErrors();
    this.sectorEditorOpen.set(true);
  }
  closeSectorEditor(): void {
    if (!this.saving()) this.sectorEditorOpen.set(false);
  }
  saveSector(payload: SectorPayload): void {
    this.saving.set(true);
    this.clearFormErrors();
    const request = this.editingSector()
      ? this.sectorApi.update(this.editingSector()!.id, payload)
      : this.sectorApi.create(payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.sectorEditorOpen.set(false);
        this.successMessage.set('El sector fue guardado correctamente.');
        this.loadAllSectors();
        this.loadSectors(this.editingSector() ? this.sectorsPagination().page : 1);
      },
      error: (error) => {
        this.formFields.set(apiFieldErrors(error));
        this.formError.set(apiErrorMessage(error));
      },
    });
  }
  removeSector(sector: Sector): void {
    if (!window.confirm(`¿Eliminar el sector "${sector.name}"?`)) return;
    this.sectorApi.delete(sector.id).subscribe({
      next: () => {
        this.successMessage.set('Sector eliminado.');
        this.loadAllSectors();
        this.loadSectors();
      },
      error: (error) => this.loadError.set(apiErrorMessage(error, 'No pudimos eliminar el sector.')),
    });
  }

  openCreateUnit(): void {
    this.editingUnit.set(null);
    this.clearFormErrors();
    this.unitEditorOpen.set(true);
  }
  openEditUnit(unit: Unit): void {
    this.editingUnit.set(unit);
    this.clearFormErrors();
    this.unitEditorOpen.set(true);
  }
  closeUnitEditor(): void {
    if (!this.saving()) this.unitEditorOpen.set(false);
  }
  saveUnit(payload: UnitPayload): void {
    this.saving.set(true);
    this.clearFormErrors();
    const request = this.editingUnit()
      ? this.unitApi.update(this.editingUnit()!.id, payload)
      : this.unitApi.create(payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.unitEditorOpen.set(false);
        this.successMessage.set('La unidad fue guardada correctamente.');
        this.loadUnits(this.editingUnit() ? this.unitsPagination().page : 1);
      },
      error: (error) => {
        this.formFields.set(apiFieldErrors(error));
        this.formError.set(apiErrorMessage(error));
      },
    });
  }
  removeUnit(unit: Unit): void {
    if (!window.confirm(`¿Eliminar la unidad "${unit.code}"?`)) return;
    this.unitApi.delete(unit.id).subscribe({
      next: () => {
        this.successMessage.set('Unidad eliminada.');
        this.loadUnits();
      },
      error: (error) => this.loadError.set(apiErrorMessage(error, 'No pudimos eliminar la unidad.')),
    });
  }

  private clearFormErrors(): void {
    this.formError.set('');
    this.formFields.set({});
  }
}