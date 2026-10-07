import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { IconComponent } from '../../../shared/ui/icon.component';
import { VisitantesApi } from './visitantes.api';
import {
  ResidentDirectoryItem,
  UnitDirectoryItem,
  VisitAuthorization,
  VisitCreatePayload,
  VisitOptions,
  VisitUpdatePayload,
} from './visitantes.models';

function datesOrderValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('valid_from')?.value;
  const until = group.get('valid_until')?.value;
  if (!from || !until) return null;
  const fromDate = new Date(from);
  const untilDate = new Date(until);
  if (untilDate <= fromDate) {
    return { datesInverted: true };
  }
  return null;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

@Component({
  selector: 'taji-visit-editor',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './visit-editor.component.html',
  styleUrls: ['./visit-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitEditorComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(VisitantesApi);

  @Input() visit: VisitAuthorization | null = null;
  @Input() options: VisitOptions = { statuses: [], document_types: [] };
  @Input() units: UnitDirectoryItem[] = [];
  @Input() residents: ResidentDirectoryItem[] = [];
  @Input() isResidentActor = false;
  @Input() residentUnitOptions: Array<{ unit_id: number; unit_code: string }> = [];

  @Output() saved = new EventEmitter<VisitAuthorization>();
  @Output() close = new EventEmitter<void>();

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly serverFieldErrors = signal<Record<string, string>>({});

  form!: FormGroup;

  get isEditMode(): boolean {
    return Boolean(this.visit && this.visit.id);
  }

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visit'] && this.form) {
      this.populateForm();
    }
  }

  private buildForm(): void {
    const now = new Date();
    const defaultUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4 horas

    this.form = this.fb.group(
      {
        visitor_first_name: ['', this.isEditMode ? [] : [Validators.required, Validators.maxLength(100)]],
        visitor_last_name: ['', this.isEditMode ? [] : [Validators.required, Validators.maxLength(120)]],
        visitor_document_type: ['CI'],
        visitor_document_number: ['', [Validators.maxLength(30)]],
        visitor_document_complement: ['', [Validators.maxLength(10)]],
        visitor_phone: ['', [Validators.maxLength(25)]],
        visitor_email: ['', [Validators.email]],
        unit_id: [
          this.isResidentActor && this.residentUnitOptions.length > 0
            ? this.residentUnitOptions[0].unit_id
            : '',
          this.isEditMode ? [] : [Validators.required],
        ],
        authorized_by_resident_id: [''],
        purpose: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
        valid_from: [toLocalDatetimeString(now), [Validators.required]],
        valid_until: [toLocalDatetimeString(defaultUntil), [Validators.required]],
        notes: [''],
      },
      { validators: datesOrderValidator },
    );

    if (this.isEditMode) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (!this.visit) return;
    const fromDate = new Date(this.visit.valid_from);
    const untilDate = new Date(this.visit.valid_until);

    this.form.patchValue({
      purpose: this.visit.purpose,
      valid_from: toLocalDatetimeString(fromDate),
      valid_until: toLocalDatetimeString(untilDate),
      notes: this.visit.notes || '',
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      if (!this.submitting()) {
        this.close.emit();
      }
    }
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return Boolean(
      (ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched)) || this.serverFieldErrors()[field],
    );
  }

  getFieldError(field: string): string | null {
    if (this.serverFieldErrors()[field]) {
      return this.serverFieldErrors()[field];
    }
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.errors || (!ctrl.dirty && !ctrl.touched)) return null;

    if (ctrl.errors['required']) return 'Este campo es obligatorio.';
    if (ctrl.errors['email']) return 'Ingresa un correo electrónico válido.';
    if (ctrl.errors['minlength']) return `Mínimo ${ctrl.errors['minlength'].requiredLength} caracteres.`;
    if (ctrl.errors['maxlength']) return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres.`;
    return 'Dato no válido.';
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.serverFieldErrors.set({});

    const raw = this.form.value;

    const validFromIso = new Date(raw.valid_from).toISOString();
    const validUntilIso = new Date(raw.valid_until).toISOString();

    if (this.isEditMode && this.visit) {
      const payload: VisitUpdatePayload = {
        purpose: raw.purpose.trim(),
        valid_from: validFromIso,
        valid_until: validUntilIso,
        notes: raw.notes ? raw.notes.trim() : undefined,
      };

      this.api
        .update(this.visit.id, payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (updated) => this.saved.emit(updated),
          error: (err) => this.handleError(err),
        });
    } else {
      const payload: VisitCreatePayload = {
        visitor_first_name: raw.visitor_first_name.trim(),
        visitor_last_name: raw.visitor_last_name.trim(),
        visitor_document_type: raw.visitor_document_type,
        visitor_document_number: raw.visitor_document_number ? raw.visitor_document_number.trim() : undefined,
        visitor_document_complement: raw.visitor_document_complement ? raw.visitor_document_complement.trim() : undefined,
        visitor_phone: raw.visitor_phone ? raw.visitor_phone.trim() : undefined,
        visitor_email: raw.visitor_email ? raw.visitor_email.trim() : undefined,
        unit_id: Number(raw.unit_id),
        authorized_by_resident_id: raw.authorized_by_resident_id ? Number(raw.authorized_by_resident_id) : undefined,
        purpose: raw.purpose.trim(),
        valid_from: validFromIso,
        valid_until: validUntilIso,
        notes: raw.notes ? raw.notes.trim() : undefined,
      };

      this.api
        .create(payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (created) => this.saved.emit(created),
          error: (err) => this.handleError(err),
        });
    }
  }

  private handleError(err: unknown): void {
    const message = apiErrorMessage(err, 'No fue posible guardar la autorización de visita.');
    this.errorMessage.set(message);
    const fieldErrs = apiFieldErrors(err);
    this.serverFieldErrors.set(fieldErrs);
  }
}
