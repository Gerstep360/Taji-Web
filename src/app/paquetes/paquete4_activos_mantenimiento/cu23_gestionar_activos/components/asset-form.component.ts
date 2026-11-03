import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

import { IconComponent } from '../../../../shared/ui/icon.component';
import { AssetState } from '../services/asset.state';
import { AssetTypeApi } from '../services/asset-type.api';
import { AssetType } from '../models/asset.models';

@Component({
  selector: 'taji-asset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="asset-form-container">
      <div class="form-header">
        <button (click)="goBack()" class="btn-back">
          <taji-icon name="arrow-left" [size]="18" />
          <span>Volver</span>
        </button>
        <h1>{{ isEditMode() ? 'Editar Activo' : 'Registrar Nuevo Activo' }}</h1>
      </div>

      @if (assetState.isLoading() && isEditMode()) {
        <div class="loading-state">
          <p>Cargando activo...</p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="asset-form">
          <div class="form-section">
            <h2>Información Básica</h2>

            <div class="form-group">
              <label for="code">Código *</label>
              <input
                id="code"
                type="text"
                formControlName="code"
                placeholder="ej. ACT-001"
                class="form-control"
              />
              @if (form.get('code')?.invalid && form.get('code')?.touched) {
                <span class="error-message">{{ getFieldError('code') }}</span>
              }
            </div>

            <div class="form-group">
              <label for="name">Nombre *</label>
              <input
                id="name"
                type="text"
                formControlName="name"
                placeholder="ej. Bomba de agua"
                class="form-control"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <span class="error-message">{{ getFieldError('name') }}</span>
              }
            </div>

            <div class="form-group">
              <label for="description">Descripción</label>
              <textarea
                id="description"
                formControlName="description"
                placeholder="Detalles adicionales..."
                class="form-control"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="form-section">
            <h2>Clasificación</h2>

            <div class="form-group">
              <label for="asset_type_id">Tipo de Activo *</label>
              <select id="asset_type_id" formControlName="asset_type_id" class="form-control">
                <option [value]="null">— Seleccionar —</option>
                @for (type of assetTypes(); track type.id) {
                  <option [value]="type.id">{{ type.name }}</option>
                }
              </select>
              @if (form.get('asset_type_id')?.invalid && form.get('asset_type_id')?.touched) {
                <span class="error-message">{{ getFieldError('asset_type_id') }}</span>
              }
            </div>

            <div class="form-group">
              <label for="sector_id">Sector / Ubicación</label>
              <select id="sector_id" formControlName="sector_id" class="form-control">
                <option [value]="null">— Ninguno —</option>
                @for (sector of sectors(); track sector.id) {
                  <option [value]="sector.id">{{ sector.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-section">
            <h2>Datos Técnicos</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="brand">Marca</label>
                <input
                  id="brand"
                  type="text"
                  formControlName="brand"
                  placeholder="ej. Pentair"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="model">Modelo</label>
                <input
                  id="model"
                  type="text"
                  formControlName="model"
                  placeholder="ej. XB100"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="serial_number">Número de Serie</label>
              <input
                id="serial_number"
                type="text"
                formControlName="serial_number"
                placeholder="ej. SN-123456"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="installation_date">Fecha de Instalación</label>
              <input
                id="installation_date"
                type="date"
                formControlName="installation_date"
                class="form-control"
              />
            </div>
          </div>

          @if (isEditMode()) {
            <div class="form-section">
              <h2>Estado</h2>

              <div class="form-group">
                <label for="status">Estado del Activo *</label>
                <select id="status" formControlName="status" class="form-control">
                  <option value="ACTIVE">Activo</option>
                  <option value="OUT_OF_SERVICE">Fuera de servicio</option>
                  <option value="MAINTENANCE">Mantenimiento</option>
                  <option value="RETIRED">Retirado</option>
                </select>
              </div>
            </div>
          }

          <div class="form-actions">
            <button type="button" (click)="goBack()" class="btn-secondary">Cancelar</button>
            <button type="submit" [disabled]="form.invalid || isSubmitting()" class="btn-primary">
              @if (isSubmitting()) {
                <span>Guardando...</span>
              } @else {
                <span>{{ isEditMode() ? 'Guardar Cambios' : 'Registrar Activo' }}</span>
              }
            </button>
          </div>

          @if (submitError()) {
            <div class="error-alert">
              <taji-icon name="alert-triangle" [size]="16" />
              <span>{{ submitError() }}</span>
            </div>
          }
        </form>
      }
    </div>
  `,
  styles: `
    .asset-form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .form-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .form-header h1 {
      margin: 0;
      font-size: 1.75rem;
    }

    .btn-back {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      color: #374151;
    }

    .btn-back:hover {
      background: #f3f4f6;
    }

    .asset-form {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
    }

    .form-section h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      font-weight: 500;
      font-size: 0.875rem;
      color: #374151;
    }

    .form-control {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .error-message {
      font-size: 0.75rem;
      color: #dc2626;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #f9fafb;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 0.375rem;
      color: #991b1b;
      font-size: 0.875rem;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    @media (max-width: 640px) {
      .asset-form-container {
        padding: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `,
})
export class AssetFormComponent implements OnInit {
  readonly assetState = inject(AssetState);
  private readonly assetTypeApi = inject(AssetTypeApi);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  form!: FormGroup;
  assetTypes = signal<AssetType[]>([]);
  sectors = signal<any[]>([]);
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  isEditMode = computed(() => Boolean(this.route.snapshot.params['id']));
  assetId = computed(() => this.route.snapshot.params['id']);

  ngOnInit(): void {
    this.initForm();
    this.loadAssetTypes();
    this.loadSectors();

    if (this.isEditMode()) {
      const id = parseInt(this.assetId(), 10);
      this.assetState.loadAssetDetail(id);
      this.assetState.loadAssetHistory(id);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      asset_type_id: [null, [Validators.required]],
      sector_id: [null],
      brand: [''],
      model: [''],
      serial_number: [''],
      installation_date: [''],
      status: ['ACTIVE'],
    });

    if (this.isEditMode()) {
      const asset = this.assetState.selectedAsset();
      if (asset) {
        this.form.patchValue({
          code: asset.code,
          name: asset.name,
          description: asset.description,
          asset_type_id: asset.asset_type_id,
          sector_id: asset.sector_id,
          brand: asset.brand,
          model: asset.model,
          serial_number: asset.serial_number,
          installation_date: asset.installation_date,
          status: asset.status,
        });
      }
    }
  }

  private loadAssetTypes(): void {
    this.assetTypeApi.listAssetTypes({ ordering: 'name' }).subscribe({
      next: (response) => {
        this.assetTypes.set(response.results);
      },
      error: (err) => {
        console.error('Error loading asset types:', err);
      },
    });
  }

  private loadSectors(): void {
    // TODO: Cargar sectores del condominio activo desde API
    // Por ahora, asumimos que se cargan desde el contexto tenant
    this.sectors.set([]);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const data = this.form.value;

    if (this.isEditMode()) {
      const id = parseInt(this.assetId(), 10);
      this.assetState.updateAsset(id, data).subscribe({
        next: () => {
          this.router.navigateByUrl('/inventario-activos');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set(err?.error?.detail || 'Error al actualizar el activo');
          console.error('Error updating asset:', err);
        },
      });
    } else {
      this.assetState.createAsset(data).subscribe({
        next: () => {
          this.router.navigateByUrl('/inventario-activos');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set(err?.error?.detail || 'Error al registrar el activo');
          console.error('Error creating asset:', err);
        },
      });
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/inventario-activos');
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    return 'Valor inválido';
  }
}
