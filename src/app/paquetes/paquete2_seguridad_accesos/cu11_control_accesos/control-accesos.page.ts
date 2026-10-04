import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AccessControlApi } from './access-control.api';
import { AccessEventItem, AccessEventType } from './access-control.models';

@Component({
  selector: 'taji-control-accesos-page',
  imports: [CommonModule, ReactiveFormsModule],
  providers: [DatePipe],
  template: `
    <section class="page-shell" aria-labelledby="access-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Seguridad · CU11</span>
          <h2 id="access-title">Control de accesos</h2>
          <p>Registra entradas, salidas y accesos denegados manteniendo el historial del turno.</p>
        </div>
      </header>

      @if (error()) {
        <div class="notice error" role="alert">{{ error() }}</div>
      }

      <div class="panel-grid">
        <form [formGroup]="form" (ngSubmit)="submit()" class="panel form-panel">
          <h3>Registrar evento</h3>

          <label>
            <span>Persona</span>
            <input type="number" formControlName="person_id" placeholder="ID de persona" />
          </label>

          <label>
            <span>Tipo de evento</span>
            <select formControlName="event_type">
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Salida</option>
              <option value="DENIED">Acceso denegado</option>
            </select>
          </label>

          <label>
            <span>Método de validación</span>
            <select formControlName="validation_method">
              <option value="MANUAL">Manual</option>
              <option value="QR">QR</option>
              <option value="FACE">Facial</option>
            </select>
          </label>

          <label>
            <span>Resultado</span>
            <select formControlName="validation_result">
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
              <option value="MANUAL_REVIEW">Revisión manual</option>
            </select>
          </label>

          <label>
            <span>Notas</span>
            <textarea formControlName="notes" rows="4" placeholder="Observaciones del guardia"></textarea>
          </label>

          <button type="submit" class="primary-action" [disabled]="submitting() || form.invalid">
            {{ submitting() ? 'Guardando...' : 'Registrar evento' }}
          </button>
        </form>

        <section class="panel history-panel" aria-live="polite">
          <div class="history-header">
            <h3>Historial reciente</h3>
            <span>{{ totalEvents() }} eventos</span>
          </div>

          @if (loading()) {
            <div class="loading-state">Cargando eventos…</div>
          } @else if (!events().length) {
            <div class="empty-state">Todavía no se registró ningún acceso.</div>
          } @else {
            <ul class="event-list">
              @for (event of events(); track event.id) {
                <li>
                  <div class="event-badge" [ngClass]="badgeClass(event.event_type)">
                    {{ event.event_type_display }}
                  </div>
                  <div>
                    <strong>{{ event.person?.full_name || 'Persona no identificada' }}</strong>
                    <small>{{ formatDate(event.occurred_at) }}</small>
                  </div>
                  <span class="status-pill">{{ event.validation_result_display }}</span>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      .page-shell { display: grid; gap: 1.5rem; }
      .page-heading { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
      .kicker { display:inline-block; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#5a6f8b; margin-bottom:.25rem; }
      .panel-grid { display:grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap:1.5rem; }
      .panel { background:#fff; border:1px solid #e6ebf5; border-radius:20px; padding:1.25rem; box-shadow:0 10px 20px rgba(15,23,42,.04); }
      .form-panel, .history-panel { display:grid; gap:1rem; }
      form { display:grid; gap:1rem; }
      label { display:grid; gap:.45rem; color:#1f2d3d; font-weight:600; }
      input, select, textarea { width:100%; border:1px solid #dfe7f5; border-radius:12px; padding:.8rem .9rem; font:inherit; background:#f8fbff; }
      .primary-action { border:none; background:#204a99; color:white; padding:.85rem 1rem; border-radius:12px; cursor:pointer; }
      .primary-action:disabled { opacity:.6; cursor:not-allowed; }
      .history-header { display:flex; justify-content:space-between; align-items:center; }
      .event-list { list-style:none; padding:0; margin:0; display:grid; gap:.9rem; }
      .event-list li { display:grid; grid-template-columns:auto 1fr auto; gap:.75rem; align-items:center; padding:.75rem; background:#f4f7ff; border-radius:12px; }
      .event-badge { padding:.35rem .65rem; border-radius:999px; font-size:.72rem; font-weight:700; }
      .event-badge.entry { background:#dcfce7; color:#166534; }
      .event-badge.exit { background:#dbeafe; color:#1d4ed8; }
      .event-badge.denied { background:#fee2e2; color:#b91c1c; }
      .status-pill { background:#edf2ff; color:#29467d; padding:.3rem .55rem; border-radius:999px; font-size:.72rem; }
      .notice { padding:.8rem 1rem; border-radius:12px; font-weight:600; }
      .notice.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
      .loading-state, .empty-state { color:#52627a; padding:1rem 0; }
      @media (max-width: 900px) { .panel-grid { grid-template-columns: 1fr; } }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlAccesosPage implements OnInit {
  private readonly accessApi = inject(AccessControlApi);

  readonly form = new FormGroup({
    person_id: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    event_type: new FormControl<AccessEventType>('ENTRY', { nonNullable: true }),
    validation_method: new FormControl('MANUAL', { nonNullable: true }),
    validation_result: new FormControl('APPROVED', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly events = signal<AccessEventItem[]>([]);
  readonly totalEvents = computed(() => this.events().length);

  ngOnInit(): void {
    this.loadRecent();
  }

  loadRecent(): void {
    this.loading.set(true);
    this.error.set(null);

    this.accessApi
      .list({ page_size: 10 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.events.set(response.results),
        error: () => this.error.set('No se pudo cargar el historial de accesos del guardia.'),
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.accessApi
      .create({
        person_id: Number(value.person_id),
        event_type: value.event_type,
        validation_method: value.validation_method,
        validation_result: value.validation_result,
        notes: value.notes,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (created) => {
          this.events.update((current) => [created, ...current].slice(0, 10));
          this.form.reset({
            person_id: null,
            event_type: 'ENTRY',
            validation_method: 'MANUAL',
            validation_result: 'APPROVED',
            notes: '',
          });
        },
        error: () => this.error.set('No se pudo registrar el acceso. Revisa la persona y el permiso del guardia.'),
      });
  }

  badgeClass(eventType: AccessEventType): string {
    return eventType.toLowerCase();
  }

  formatDate(value: string): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    return date.toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
