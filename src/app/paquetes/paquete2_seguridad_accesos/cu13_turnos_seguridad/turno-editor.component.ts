import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StaffMember } from '../../paquete1_usuarios_condominio/cu07_personal/staff.models';
import { SecurityShift, ShiftPayload } from './turnos.models';

@Component({
  selector: 'taji-turno-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './turno-editor.component.html',
  styleUrl: './turno-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnoEditorComponent {
  private readonly fb = inject(FormBuilder);
  readonly shift = input<SecurityShift | null>(null);
  readonly securityStaff = input<StaffMember[]>([]);
  readonly saving = input(false);
  readonly formError = input('');
  readonly fieldErrors = input<Record<string, string>>({});
  readonly cancelled = output<void>();
  readonly submitted = output<ShiftPayload>();

  readonly form = this.fb.nonNullable.group({
    guard_staff: [0, [Validators.required, Validators.min(1)]],
    fecha: ['', [Validators.required]],
    hora_inicio: ['08:00', [Validators.required]],
    hora_fin: ['16:00', [Validators.required]],
    observation: [''],
  });

  constructor() {
    effect(() => this.populate(this.shift(), this.securityStaff()));
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

    if (raw.hora_fin <= raw.hora_inicio) {
      this.form.controls.hora_fin.setErrors({ timeOrder: true });
      this.form.controls.hora_fin.markAsTouched();
      return;
    }

    const startIso = `${raw.fecha}T${raw.hora_inicio}:00`;
    const endIso = `${raw.fecha}T${raw.hora_fin}:00`;

    this.submitted.emit({
      guard_staff: Number(raw.guard_staff),
      scheduled_start: new Date(startIso).toISOString(),
      scheduled_end: new Date(endIso).toISOString(),
      observation: raw.observation.trim(),
    });
  }

  fieldError(field: string): string {
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.hasError('required') || control.hasError('min')) return 'Este campo es obligatorio.';
    if (control.hasError('timeOrder')) return 'La hora fin debe ser posterior a la hora inicio.';
    return '';
  }

  private populate(shift: SecurityShift | null, guards: StaffMember[]): void {
    let fechaStr = '';
    let startStr = '08:00';
    let endStr = '16:00';

    if (shift) {
      const dtStart = new Date(shift.scheduled_start);
      const dtEnd = new Date(shift.scheduled_end);

      fechaStr = dtStart.toISOString().substring(0, 10);
      startStr = dtStart.toTimeString().substring(0, 5);
      endStr = dtEnd.toTimeString().substring(0, 5);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      fechaStr = tomorrow.toISOString().substring(0, 10);
    }

    const defaultGuard = shift?.guard_staff ?? (guards.length > 0 ? guards[0].id : 0);

    this.form.reset({
      guard_staff: defaultGuard,
      fecha: fechaStr,
      hora_inicio: startStr,
      hora_fin: endStr,
      observation: shift?.observation ?? '',
    });
  }
}
