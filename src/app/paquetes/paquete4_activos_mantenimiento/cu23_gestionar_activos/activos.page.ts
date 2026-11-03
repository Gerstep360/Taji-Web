import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { ActivosApi } from './activos.api';
import {
  Asset,
  AssetFilters,
  AssetHistory,
  AssetQrCode,
  AssetType,
  SectorOption,
} from './activos.models';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  OUT_OF_SERVICE: 'Fuera de servicio',
  MAINTENANCE: 'En mantenimiento',
  RETIRED: 'Retirado',
};

@Component({
  selector: 'taji-activos-page',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <section class="activos-page" aria-labelledby="activos-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Activos y Mantenimiento · CU23</span>
          <h2 id="activos-title">Inventario de activos</h2>
          <p>Registra los activos del condominio, consulta su ficha, su QR y su historial.</p>
        </div>
        @if (canManage()) {
          <button class="primary-action" type="button" (click)="openCreate()">
            <span aria-hidden="true">+</span> Nuevo activo
          </button>
        }
      </header>

      @if (!canManage()) {
        <div class="notice info" role="status">
          Tienes acceso de solo lectura al inventario de activos.
        </div>
      }
      @if (loadError()) {
        <div class="notice error" role="alert">
          <span>{{ loadError() }}</span>
          <button type="button" (click)="load()">Reintentar</button>
        </div>
      }

      <form class="filters" [formGroup]="filters" aria-label="Filtros de activos">
        <label class="search-field">
          <span class="sr-only">Buscar activo</span>
          <input
            formControlName="search"
            type="search"
            placeholder="Buscar por código, nombre, marca o serie"
          />
        </label>
        <label>
          <span>Tipo</span>
          <select formControlName="asset_type">
            <option value="">Todos los tipos</option>
            @for (type of assetTypes(); track type.id) {
              <option [value]="type.id">{{ type.name }}</option>
            }
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select formControlName="status">
            <option value="">Todos los estados</option>
            @for (statusOption of statusOptions; track statusOption.value) {
              <option [value]="statusOption.value">{{ statusOption.label }}</option>
            }
          </select>
        </label>
        @if (canManage()) {
          <button class="secondary-action" type="button" (click)="openTypeManager()">
            Tipos de activo
          </button>
        }
      </form>

      <section class="inventory" [attr.aria-busy]="loading()">
        @if (loading()) {
          <div class="loading-state" role="status"><p>Cargando inventario…</p></div>
        } @else if (!assets().length) {
          <div class="empty-state">
            <h3>No hay activos registrados</h3>
            <p>Registra el primer activo del condominio para empezar a darle seguimiento.</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Sector</th>
                  <th>Estado</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (asset of assets(); track asset.id) {
                  <tr [class.is-selected]="selectedAsset()?.id === asset.id">
                    <td>
                      <button type="button" class="link-cell" (click)="openFicha(asset)">
                        <strong>{{ asset.name }}</strong>
                        <small>{{ asset.code }}</small>
                      </button>
                    </td>
                    <td>{{ asset.asset_type_name }}</td>
                    <td>{{ asset.sector_name || 'Sin sector' }}</td>
                    <td><span [class]="'status-badge status-' + asset.status.toLowerCase()">{{ statusLabel(asset.status) }}</span></td>
                    <td>
                      <div class="row-actions">
                        <button type="button" (click)="openFicha(asset)">Ficha</button>
                        @if (canManage()) {
                          <button type="button" (click)="openEdit(asset)">Editar</button>
                          @if (asset.status !== 'RETIRED') {
                            <button class="danger" type="button" (click)="retire(asset)">
                              Dar de baja
                            </button>
                          }
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </section>

    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="closeEditor()"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header class="modal-header">
          <h3 id="editor-title">{{ editing() ? 'Editar activo' : 'Nuevo activo' }}</h3>
          <button type="button" class="close" (click)="closeEditor()" aria-label="Cerrar">×</button>
        </header>

        @if (formError()) {
          <div class="notice error" role="alert">{{ formError() }}</div>
        }

        <form [formGroup]="editorForm" (ngSubmit)="save()" novalidate>
          <label class="modal-field">
            <span>Código *</span>
            <input formControlName="code" type="text" placeholder="AS-001" />
            <small class="error-text">{{ fieldError('code') }}</small>
          </label>
          <label class="modal-field">
            <span>Nombre *</span>
            <input formControlName="name" type="text" placeholder="Ascensor torre A" />
            <small class="error-text">{{ fieldError('name') }}</small>
          </label>
          <label class="modal-field">
            <span>Tipo de activo *</span>
            <select formControlName="asset_type_id">
              <option value="" disabled>Selecciona un tipo</option>
              @for (type of assetTypes(); track type.id) {
                <option [value]="type.id">{{ type.name }}</option>
              }
            </select>
            <small class="error-text">{{ fieldError('asset_type_id') }}</small>
          </label>
          <label class="modal-field">
            <span>Sector *</span>
            <select formControlName="sector_id">
              <option value="" disabled>Selecciona un sector</option>
              @for (sector of sectors(); track sector.id) {
                <option [value]="sector.id">{{ sector.name }}</option>
              }
            </select>
            <small class="error-text">{{ fieldError('sector_id') }}</small>
          </label>
          <label class="modal-field">
            <span>Marca</span>
            <input formControlName="brand" type="text" />
          </label>
          <label class="modal-field">
            <span>Modelo</span>
            <input formControlName="model" type="text" />
          </label>
          <label class="modal-field">
            <span>Nº de serie</span>
            <input formControlName="serial_number" type="text" />
          </label>
          <label class="modal-field">
            <span>Fecha de instalación</span>
            <input formControlName="installation_date" type="date" />
          </label>
          @if (editing()) {
            <label class="modal-field">
              <span>Estado</span>
              <select formControlName="status">
                @for (statusOption of statusOptions; track statusOption.value) {
                  <option [value]="statusOption.value">{{ statusOption.label }}</option>
                }
              </select>
            </label>
          }
          <label class="modal-field">
            <span>Descripción</span>
            <textarea formControlName="description" rows="2"></textarea>
          </label>

          <div class="modal-actions">
            <button type="button" class="secondary" (click)="closeEditor()">Cancelar</button>
            <button type="submit" class="primary" [disabled]="saving()">
              {{ saving() ? 'Guardando…' : 'Guardar activo' }}
            </button>
          </div>
        </form>
      </div>
    }

    @if (typeManagerOpen()) {
      <div class="modal-backdrop" (click)="closeTypeManager()"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="type-manager-title">
        <header class="modal-header">
          <h3 id="type-manager-title">Tipos de activo</h3>
          <button type="button" class="close" (click)="closeTypeManager()" aria-label="Cerrar">×</button>
        </header>

        @if (typeFormError()) {
          <div class="notice error" role="alert">{{ typeFormError() }}</div>
        }

        <form class="inline-form" [formGroup]="typeForm" (ngSubmit)="saveType()" novalidate>
          <input formControlName="code" type="text" placeholder="Código" />
          <input formControlName="name" type="text" placeholder="Nombre (ej. Ascensor)" />
          <button type="submit" class="primary" [disabled]="savingType()">Agregar</button>
        </form>

        <ul class="type-list">
          @for (type of assetTypes(); track type.id) {
            <li>
              <span>{{ type.name }}</span>
              <small>{{ type.code }}</small>
              <span class="pill" [class.inactive]="!type.is_active">{{ type.is_active ? 'Activo' : 'Inactivo' }}</span>
            </li>
          }
        </ul>
      </div>
    }

    @if (selectedAsset()) {
      <div class="drawer-backdrop" (click)="closeFicha()"></div>
      <aside class="ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-title">
        <header>
          <div>
            <span class="kicker">Ficha del activo</span>
            <h2 id="ficha-title">{{ selectedAsset()?.name }}</h2>
            <p>{{ selectedAsset()?.code }} · {{ selectedAsset()?.asset_type_name }}</p>
          </div>
          <button type="button" class="close" (click)="closeFicha()" aria-label="Cerrar ficha">×</button>
        </header>

        <section class="ficha-body">
          <dl class="ficha-data">
            <div><dt>Sector</dt><dd>{{ selectedAsset()?.sector_name || 'Sin sector' }}</dd></div>
            <div><dt>Estado</dt><dd>{{ statusLabel(selectedAsset()?.status || '') }}</dd></div>
            <div><dt>Marca / Modelo</dt><dd>{{ selectedAsset()?.brand || '—' }} / {{ selectedAsset()?.model || '—' }}</dd></div>
            <div><dt>Nº de serie</dt><dd>{{ selectedAsset()?.serial_number || '—' }}</dd></div>
            <div><dt>Instalación</dt><dd>{{ selectedAsset()?.installation_date || '—' }}</dd></div>
          </dl>

          <div class="qr-block">
            <h3>Código QR</h3>
            @if (qrLoading()) {
              <p>Generando QR…</p>
            } @else if (qr()) {
              <img [src]="qrImageSrc()" alt="Código QR del activo" width="160" height="160" />
              <a [href]="qrImageSrc()" [download]="'qr-' + selectedAsset()?.code + '.svg'">Descargar QR</a>
            } @else {
              <p>No se pudo generar el QR.</p>
            }
          </div>

          <div class="history-block">
            <h3>Historial</h3>
            @if (historyLoading()) {
              <p>Cargando historial…</p>
            } @else {
              <section>
                <h4>Incidencias ({{ history()?.incidents?.length || 0 }})</h4>
                @if (!history()?.incidents?.length) {
                  <p class="muted">Sin incidencias registradas.</p>
                } @else {
                  <ul>
                    @for (incident of history()?.incidents; track incident.id) {
                      <li>{{ incident.public_code }} · {{ incident.title || 'Sin título' }} · {{ incident.status }}</li>
                    }
                  </ul>
                }
              </section>
              <section>
                <h4>Órdenes de trabajo ({{ history()?.work_orders?.length || 0 }})</h4>
                @if (!history()?.work_orders?.length) {
                  <p class="muted">Sin órdenes de trabajo.</p>
                } @else {
                  <ul>
                    @for (order of history()?.work_orders; track order.id) {
                      <li>{{ order.public_code }} · {{ order.title }} · {{ order.status }}</li>
                    }
                  </ul>
                }
              </section>
              <section>
                <h4>Planes de mantenimiento ({{ history()?.maintenance_plans?.length || 0 }})</h4>
                @if (!history()?.maintenance_plans?.length) {
                  <p class="muted">Sin planes preventivos.</p>
                } @else {
                  <ul>
                    @for (plan of history()?.maintenance_plans; track plan.id) {
                      <li>{{ plan.name }} · cada {{ plan.frequency_days }} días · próximo {{ plan.next_due_at | date }}</li>
                    }
                  </ul>
                }
              </section>
            }
          </div>
        </section>
      </aside>
    }
  `,
  styleUrl: './activos.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivosPage implements OnInit {
  private readonly api = inject(ActivosApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions = [
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'MAINTENANCE', label: 'En mantenimiento' },
    { value: 'OUT_OF_SERVICE', label: 'Fuera de servicio' },
    { value: 'RETIRED', label: 'Retirado' },
  ];

  readonly assets = signal<Asset[]>([]);
  readonly assetTypes = signal<AssetType[]>([]);
  readonly sectors = signal<SectorOption[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly editorOpen = signal(false);
  readonly editing = signal<Asset | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly formFields = signal<Record<string, string>>({});

  readonly typeManagerOpen = signal(false);
  readonly savingType = signal(false);
  readonly typeFormError = signal<string | null>(null);

  readonly selectedAsset = signal<Asset | null>(null);
  readonly qr = signal<AssetQrCode | null>(null);
  readonly qrLoading = signal(false);
  readonly history = signal<AssetHistory | null>(null);
  readonly historyLoading = signal(false);

  readonly canManage = computed(() => {
    const user = this.auth.user();
    return !!user && (user.is_superuser || !!user.role?.permissions.includes('manage_assets'));
  });

  readonly qrImageSrc = computed(() => {
    const code = this.qr();
    if (!code) return null;
    return `data:${code.image_media_type};base64,${code.image_base64}`;
  });

  readonly filters = this.fb.nonNullable.group({
    search: '',
    status: '' as string,
    asset_type: '' as string,
  });

  readonly editorForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    asset_type_id: ['', Validators.required],
    sector_id: ['', Validators.required],
    brand: '',
    model: '',
    serial_number: '',
    installation_date: '',
    status: 'ACTIVE',
    description: '',
  });

  readonly typeForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
  });

  ngOnInit(): void {
    this.filters.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
    this.loadCatalogs();
    this.load();
  }

  statusLabel(value: string): string {
    return STATUS_LABELS[value] ?? value;
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const raw = this.filters.getRawValue();
    const criteria: AssetFilters = {
      search: raw.search || undefined,
      status: (raw.status || '') as AssetFilters['status'],
      asset_type: raw.asset_type ? Number(raw.asset_type) : '',
    };
    this.api.listAssets(criteria).subscribe({
      next: (page) => {
        this.assets.set(page.results);
        this.loading.set(false);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private loadCatalogs(): void {
    this.api.listAssetTypes().subscribe({
      next: (page) => this.assetTypes.set(page.results),
      error: () => this.assetTypes.set([]),
    });
    if (this.canManage()) {
      this.api.listSectors().subscribe({
        next: (page) => this.sectors.set(page.results),
        error: () => this.sectors.set([]),
      });
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formFields.set({});
    this.editorForm.reset({
      code: '',
      name: '',
      asset_type_id: '',
      sector_id: '',
      brand: '',
      model: '',
      serial_number: '',
      installation_date: '',
      status: 'ACTIVE',
      description: '',
    });
    this.editorOpen.set(true);
  }

  openEdit(asset: Asset): void {
    this.editing.set(asset);
    this.formError.set(null);
    this.formFields.set({});
    this.editorForm.reset({
      code: asset.code,
      name: asset.name,
      asset_type_id: String(asset.asset_type_id),
      sector_id: String(asset.sector_id),
      brand: asset.brand,
      model: asset.model,
      serial_number: asset.serial_number,
      installation_date: asset.installation_date ?? '',
      status: asset.status,
      description: asset.description,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  save(): void {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const raw = this.editorForm.getRawValue();
    const payload = {
      code: raw.code,
      name: raw.name,
      asset_type_id: Number(raw.asset_type_id),
      sector_id: Number(raw.sector_id),
      brand: raw.brand,
      model: raw.model,
      serial_number: raw.serial_number,
      installation_date: raw.installation_date || null,
      status: raw.status,
      description: raw.description,
    };
    const editing = this.editing();
    const request = editing
      ? this.api.updateAsset(editing.id, payload)
      : this.api.createAsset(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
        this.formFields.set(apiFieldErrors(error));
      },
    });
  }

  fieldError(field: string): string {
    return this.formFields()[field] ?? '';
  }

  retire(asset: Asset): void {
    if (!confirm(`¿Dar de baja el activo ${asset.name}?`)) return;
    this.api.retireAsset(asset.id).subscribe({
      next: () => this.load(),
      error: (error) => this.loadError.set(apiErrorMessage(error)),
    });
  }

  openTypeManager(): void {
    this.typeFormError.set(null);
    this.typeForm.reset({ code: '', name: '' });
    this.typeManagerOpen.set(true);
  }

  closeTypeManager(): void {
    this.typeManagerOpen.set(false);
  }

  saveType(): void {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }
    this.savingType.set(true);
    this.typeFormError.set(null);
    this.api.createAssetType(this.typeForm.getRawValue()).subscribe({
      next: (type) => {
        this.savingType.set(false);
        this.assetTypes.set([...this.assetTypes(), type]);
        this.typeForm.reset({ code: '', name: '' });
      },
      error: (error) => {
        this.savingType.set(false);
        this.typeFormError.set(apiErrorMessage(error));
      },
    });
  }

  openFicha(asset: Asset): void {
    this.selectedAsset.set(asset);
    this.qr.set(null);
    this.history.set(null);
    this.qrLoading.set(true);
    this.historyLoading.set(true);

    this.api.getQr(asset.id).subscribe({
      next: (qr) => {
        this.qr.set(qr);
        this.qrLoading.set(false);
      },
      error: () => this.qrLoading.set(false),
    });

    this.api.getHistory(asset.id).subscribe({
      next: (history) => {
        this.history.set(history);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  closeFicha(): void {
    this.selectedAsset.set(null);
  }
}
