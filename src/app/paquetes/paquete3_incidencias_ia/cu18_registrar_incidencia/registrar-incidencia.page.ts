import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { apiErrorMessage, apiErrorMessageWithTrace, apiErrorTraceId, apiFieldErrors } from '../../../core/api-error';
import { IconComponent } from '../../../shared/ui/icon.component';
import { EvidenceKind, evidenceKind, formatFileSize, selectEvidences } from './evidence-rules';
import { RegistrarIncidenciaApi } from './registrar-incidencia.api';
import {
  IncidentAssetOption,
  IncidentReport,
  IncidentReportOptions,
  IncidentSectorOption,
  IncidentUnitOption,
} from './registrar-incidencia.models';

export const DESCRIPTION_MAX_LENGTH = 5000;
export const TITLE_MAX_LENGTH = 160;

type FieldName = 'title' | 'description' | 'category' | 'sector' | 'unit' | 'asset';

interface EvidencePreview {
  id: number;
  file: File;
  kind: EvidenceKind;
  previewUrl: string | null;
  sizeLabel: string;
}

const PERMISSION_MESSAGE = 'No tienes permiso para registrar incidencias en este condominio.';
const FORM_FIELDS: readonly FieldName[] = ['title', 'description', 'category', 'sector', 'unit', 'asset'];

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && !control.value.trim() ? { required: true } : null;
}

@Component({
  selector: 'taji-registrar-incidencia-page',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './registrar-incidencia.page.html',
  styleUrl: './registrar-incidencia.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarIncidenciaPage {
  private readonly api = inject(RegistrarIncidenciaApi);
  private readonly destroyRef = inject(DestroyRef);
  private nextEvidenceId = 1;

  readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  readonly titleMaxLength = TITLE_MAX_LENGTH;

  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.maxLength(TITLE_MAX_LENGTH)]],
    description: ['', [Validators.required, notBlank, Validators.maxLength(DESCRIPTION_MAX_LENGTH)]],
    category: ['', [Validators.required]],
    sector: ['', [Validators.required]],
    unit: [''],
    asset: [''],
  });

  readonly options = signal<IncidentReportOptions | null>(null);
  readonly loadingOptions = signal(false);
  readonly optionsError = signal('');

  readonly evidences = signal<EvidencePreview[]>([]);
  readonly evidenceErrors = signal<string[]>([]);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly serverFieldErrors = signal<Record<string, string>>({});
  readonly created = signal<IncidentReport | null>(null);

  private readonly selectedSector = signal('');
  private readonly selectedCategory = signal('');

  readonly sectorOptions = computed(() => {
    const sectors = this.options()?.sectors ?? [];
    return sectors.map((sector) => ({ id: sector.id, label: sectorLabel(sector, sectors) }));
  });

  /** Unidades del sector elegido y de sus subsectores (solo ayuda visual). */
  readonly availableUnits = computed<IncidentUnitOption[]>(() => {
    const scope = this.sectorScope();
    const units = this.options()?.units ?? [];
    return scope ? units.filter((unit) => unit.sector !== null && scope.has(unit.sector)) : units;
  });

  /** Activos del sector elegido y los que no pertenecen a ningún sector. */
  readonly availableAssets = computed<IncidentAssetOption[]>(() => {
    const scope = this.sectorScope();
    const assets = this.options()?.assets ?? [];
    return scope ? assets.filter((asset) => asset.sector === null || scope.has(asset.sector)) : assets;
  });

  readonly categoryHint = computed(() => {
    const id = Number(this.selectedCategory());
    return this.options()?.categories.find((category) => category.id === id)?.description ?? '';
  });

  readonly evidenceHint = computed(() => {
    const rules = this.options()?.evidence_rules;
    if (!rules) return '';
    const formats = rules.allowed_extensions.map((ext) => ext.toUpperCase()).join(', ');
    return `Hasta ${rules.max_files} archivos · ${formats} · máximo ${formatFileSize(rules.max_file_size_bytes)} cada uno.`;
  });

  readonly canAddEvidence = computed(() => {
    const rules = this.options()?.evidence_rules;
    return Boolean(rules) && this.evidences().length < (rules?.max_files ?? 0);
  });

  private readonly sectorScope = computed<Set<number> | null>(() => {
    const id = Number(this.selectedSector());
    if (!id) return null;
    return descendantsOf(id, this.options()?.sectors ?? []);
  });

  constructor() {
    const controls = this.form.controls;
    controls.sector.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedSector.set(value);
      if (controls.unit.value && !this.availableUnits().some((unit) => String(unit.id) === controls.unit.value)) {
        controls.unit.setValue('');
      }
      if (controls.asset.value && !this.availableAssets().some((asset) => String(asset.id) === controls.asset.value)) {
        controls.asset.setValue('');
      }
    });
    controls.category.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => this.selectedCategory.set(value));
    // Un error del servidor deja de aplicar en cuanto el usuario corrige el campo.
    for (const field of FORM_FIELDS) {
      controls[field].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.clearServerError(field));
    }

    this.destroyRef.onDestroy(() => this.revokePreviews(this.evidences()));
    this.loadOptions();
  }

  loadOptions(): void {
    this.loadingOptions.set(true);
    this.optionsError.set('');
    this.api
      .options()
      .pipe(
        finalize(() => this.loadingOptions.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (options) => this.options.set(options),
        error: (error: unknown) =>
          this.optionsError.set(
            isStatus(error, 403)
              ? apiErrorMessage(error, PERMISSION_MESSAGE)
              : 'No pudimos cargar las opciones del formulario. Intenta nuevamente.',
          ),
      });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rules = this.options()?.evidence_rules;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    if (!rules || !incoming.length) return;

    const current = this.evidences().map((item) => item.file);
    const { accepted, errors } = selectEvidences(current, incoming, rules);
    this.evidenceErrors.set(errors);
    this.clearServerError('evidences');
    if (!accepted.length) return;
    this.evidences.update((items) => [...items, ...accepted.map((file) => this.toPreview(file))]);
  }

  removeEvidence(id: number): void {
    const removed = this.evidences().filter((item) => item.id === id);
    this.revokePreviews(removed);
    this.evidences.update((items) => items.filter((item) => item.id !== id));
    this.evidenceErrors.set([]);
  }

  isFieldInvalid(field: FieldName): boolean {
    return Boolean(this.fieldError(field));
  }

  fieldError(field: FieldName | 'evidences'): string {
    const server = this.serverFieldErrors()[field];
    if (server) return server;
    if (field === 'evidences') return '';
    const control = this.form.controls[field];
    if (!control.errors || !(control.touched || control.dirty)) return '';
    if (control.errors['required']) {
      return {
        description: 'La descripción es obligatoria.',
        category: 'Selecciona una categoría.',
        sector: 'Selecciona la ubicación de la incidencia.',
      }[field as 'description' | 'category' | 'sector'] ?? 'Este campo es obligatorio.';
    }
    if (control.errors['maxlength']) {
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    }
    return 'Dato no válido.';
  }

  submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('');
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set('');
    this.serverFieldErrors.set({});

    this.api
      .create({
        title: raw.title.trim(),
        description: raw.description.trim(),
        category: Number(raw.category),
        sector: Number(raw.sector),
        unit: raw.unit ? Number(raw.unit) : null,
        asset: raw.asset ? Number(raw.asset) : null,
        evidences: this.evidences().map((item) => item.file),
      })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (incident) => {
          this.clearEvidences();
          this.created.set(incident);
        },
        error: (error: unknown) => this.handleSubmitError(error),
      });
  }

  registerAnother(): void {
    this.created.set(null);
    this.errorMessage.set('');
    this.serverFieldErrors.set({});
    this.clearEvidences();
    this.form.reset();
  }

  private handleSubmitError(error: unknown): void {
    if (isStatus(error, 400)) {
      const fields = apiFieldErrors(error);
      const known = new Set<string>([...FORM_FIELDS, 'evidences']);
      const unmapped = Object.entries(fields).filter(([field]) => !known.has(field)).map(([, message]) => message);
      this.serverFieldErrors.set(fields);
      this.errorMessage.set(
        unmapped.length
          ? unmapped.join(' ')
          : Object.keys(fields).length
            ? 'Revisa los campos marcados e intenta nuevamente.'
            : apiErrorMessage(error, 'Revisa los datos de la incidencia e intenta nuevamente.'),
      );
      return;
    }
    if (isStatus(error, 403)) {
      this.errorMessage.set(apiErrorMessage(error, PERMISSION_MESSAGE));
      return;
    }
    if (isStatus(error, 503)) {
      const traceId = apiErrorTraceId(error);
      this.errorMessage.set(
        'No pudimos guardar las evidencias en este momento. Tus datos se conservan; intenta nuevamente.' +
          (traceId ? ` (ref. ${traceId})` : ''),
      );
      return;
    }
    if (isStatus(error, 0)) {
      this.errorMessage.set('No fue posible comunicarse con el servidor. Revisa tu conexión e intenta nuevamente.');
      return;
    }
    this.errorMessage.set(apiErrorMessageWithTrace(error, 'No pudimos registrar la incidencia. Intenta nuevamente.'));
  }

  private clearServerError(field: string): void {
    if (!(field in this.serverFieldErrors())) return;
    this.serverFieldErrors.update(({ [field]: _removed, ...rest }) => rest);
  }

  private toPreview(file: File): EvidencePreview {
    const kind = evidenceKind(file);
    const canPreview = kind === 'image' && typeof URL.createObjectURL === 'function';
    return {
      id: this.nextEvidenceId++,
      file,
      kind,
      previewUrl: canPreview ? URL.createObjectURL(file) : null,
      sizeLabel: formatFileSize(file.size),
    };
  }

  private clearEvidences(): void {
    this.revokePreviews(this.evidences());
    this.evidences.set([]);
    this.evidenceErrors.set([]);
  }

  private revokePreviews(items: readonly EvidencePreview[]): void {
    for (const item of items) {
      if (item.previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(item.previewUrl);
    }
  }
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}

function descendantsOf(rootId: number, sectors: readonly IncidentSectorOption[]): Set<number> {
  const scope = new Set<number>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const sector of sectors) {
      if (sector.parent !== null && scope.has(sector.parent) && !scope.has(sector.id)) {
        scope.add(sector.id);
        grew = true;
      }
    }
  }
  return scope;
}

function sectorLabel(sector: IncidentSectorOption, sectors: readonly IncidentSectorOption[]): string {
  const names = [sector.name];
  const seen = new Set<number>([sector.id]);
  let parentId = sector.parent;
  while (parentId !== null && !seen.has(parentId)) {
    const parent = sectors.find((item) => item.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    seen.add(parent.id);
    parentId = parent.parent;
  }
  return names.join(' › ');
}
