import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AccessControlApi } from './access-control.api';
import {
  AccessEventItem,
  AccessEventMethod,
  AccessEventResult,
  AccessEventType,
  AccessPersonOption,
  AccessUnitOption,
} from './access-control.models';

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
      @if (success()) {
        <div class="notice success" role="status">{{ success() }}</div>
      }

      <div class="panel-grid">
        <form [formGroup]="form" (ngSubmit)="submit()" class="panel form-panel">
          <h3>Registrar evento</h3>

          <fieldset class="person-type-fieldset">
            <legend>¿La persona está registrada?</legend>
            <div class="person-type-options" role="radiogroup" aria-label="Estado de registro">
              <label [class.selected]="form.controls.person_mode.value === 'registered'">
                <input type="radio" formControlName="person_mode" value="registered" (change)="onPersonModeChange()" />
                <span>Sí, buscar persona</span>
              </label>
              <label [class.selected]="form.controls.person_mode.value === 'visitor'">
                <input type="radio" formControlName="person_mode" value="visitor" (change)="onPersonModeChange()" />
                <span>No, es visitante</span>
              </label>
            </div>
          </fieldset>

          @if (form.controls.person_mode.value === 'registered') {
            <label>
              <span>Buscar por nombre o carnet</span>
              <input [formControl]="personSearch" (input)="clearSelectedPerson()" autocomplete="off" placeholder="Escribe al menos 2 caracteres" />
            </label>
            @if (people().length) {
              <div class="lookup-results" aria-label="Personas encontradas">
                @for (person of people(); track person.id) {
                  <button type="button" [class.selected]="selectedPerson()?.id === person.id" (click)="selectPerson(person)">
                    <strong>{{ person.full_name }}</strong>
                    <small>Carnet: {{ person.document_number || 'No registrado' }}</small>
                    @if (person.units.length) {
                      <small>Unidades asociadas: {{ unitCodes(person.units) }}</small>
                    }
                  </button>
                }
              </div>
            } @else if (personSearch.value.trim().length >= 2 && !searchingPeople()) {
              <p class="lookup-empty">No encontramos a esa persona. Cambia a “No, es visitante” para registrar sus datos.</p>
            }
            @if (selectedPerson(); as person) {
              <div class="selection-summary">
                <span>Persona seleccionada</span>
                <strong>{{ person.full_name }} · CI {{ person.document_number || 'no registrado' }}</strong>
                <button type="button" (click)="clearSelectedPerson()">Cambiar persona</button>
              </div>
            }
            @if (form.controls.person_id.touched && form.controls.person_id.invalid) {
              <small class="field-error">Selecciona una persona de los resultados.</small>
            }
          } @else {
            <div class="form-grid">
              <label>
                <span>Nombre completo *</span>
                <input formControlName="visitor_name" autocomplete="off" placeholder="Nombre y apellidos" />
                @if (form.controls.visitor_name.touched && form.controls.visitor_name.invalid) {
                  <small class="field-error">Ingresa el nombre del visitante.</small>
                }
              </label>
              <label>
                <span>Número de carnet *</span>
                <input formControlName="visitor_document_number" autocomplete="off" placeholder="CI del visitante" />
                @if (form.controls.visitor_document_number.touched && form.controls.visitor_document_number.invalid) {
                  <small class="field-error">Ingresa el número de carnet.</small>
                }
              </label>
            </div>
            <p class="field-hint">Estos datos quedan asociados solo a este registro de acceso; no crean una cuenta ni un residente.</p>
          }

          <label>
            <span>Casa o unidad de destino *</span>
            <input [formControl]="unitSearch" (input)="clearSelectedUnit()" autocomplete="off" placeholder="Buscar por número de casa, bloque o sector" />
          </label>
          @if (units().length) {
            <div class="lookup-results unit-results" aria-label="Unidades encontradas">
              @for (unit of units(); track unit.id) {
                <button type="button" [class.selected]="form.controls.unit_id.value === unit.id" (click)="selectUnit(unit)">
                  <strong>{{ unit.code }}</strong>
                  <small>{{ unit.unit_type }}{{ unit.sector ? ' · ' + unit.sector : '' }}</small>
                </button>
              }
            </div>
          } @else if (unitSearch.value.trim() && !searchingUnits()) {
            <p class="lookup-empty">No se encontraron unidades activas.</p>
          }
          @if (selectedUnit(); as unit) {
            <div class="selection-summary">
              <span>Destino seleccionado</span>
              <strong>{{ unit.code }} · {{ unit.unit_type }}{{ unit.sector ? ' · ' + unit.sector : '' }}</strong>
              <button type="button" (click)="clearSelectedUnit()">Cambiar destino</button>
            </div>
          }
          @if (form.controls.unit_id.touched && form.controls.unit_id.invalid) {
            <small class="field-error">Selecciona la unidad de destino en los resultados.</small>
          }

          <fieldset class="event-type-fieldset">
            <legend>Tipo de evento</legend>
            <div class="event-type-options" role="radiogroup" aria-label="Tipo de evento">
              <label [class.selected]="form.controls.event_type.value === 'ENTRY'">
                <input type="radio" formControlName="event_type" value="ENTRY" (change)="onEventTypeChange()" />
                <span>Entrada</span>
              </label>
              <label [class.selected]="form.controls.event_type.value === 'EXIT'">
                <input type="radio" formControlName="event_type" value="EXIT" (change)="onEventTypeChange()" />
                <span>Salida</span>
              </label>
              <label [class.selected]="form.controls.event_type.value === 'DENIED'">
                <input type="radio" formControlName="event_type" value="DENIED" (change)="onEventTypeChange()" />
                <span>Acceso denegado</span>
              </label>
            </div>
          </fieldset>

          <p class="field-hint">El resultado se determina automáticamente: Entrada y Salida aprobadas; Acceso denegado rechazado.</p>

          <label>
            <span>Notas</span>
            <textarea formControlName="notes" rows="4" maxlength="300" placeholder="Observaciones del guardia"></textarea>
          </label>

          <button type="submit" class="primary-action" [disabled]="submitting()">
            {{ submitting() ? 'Guardando...' : 'Registrar evento' }}
          </button>
        </form>

        <section class="panel history-panel" aria-live="polite">
          <div class="history-header">
            <h3>Historial reciente</h3>
            <span>{{ totalEvents() }} {{ totalEvents() === 1 ? 'evento' : 'eventos' }}</span>
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
                    <strong>{{ event.person?.full_name || event.visitor_name || 'Persona no identificada' }}</strong>
                    @if (!event.person && event.visitor_document_number) {
                      <small>CI {{ event.visitor_document_number }}</small>
                    }
                    @if (event.unit) {
                      <small>Destino: {{ event.unit.code }}{{ event.unit.sector_name ? ' · ' + event.unit.sector_name : '' }}</small>
                    }
                    <small>{{ formatDate(event.occurred_at) }} · {{ event.validation_method_display }}</small>
                    @if (event.notes) {
                      <small class="event-note">{{ event.notes }}</small>
                    }
                  </div>
                  <span class="status-pill" [class.rejected]="event.validation_result === 'REJECTED'">
                    {{ event.validation_result_display }}
                  </span>
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
      .person-type-fieldset { min-width:0; margin:0; padding:0; border:0; }
      .person-type-fieldset legend { margin-bottom:.45rem; color:#1f2d3d; font-weight:600; }
      .person-type-options { display:grid; grid-template-columns:1fr 1fr; gap:.5rem; }
      .person-type-options label { min-height:2.7rem; display:flex; align-items:center; justify-content:center; gap:.45rem; padding:.5rem; border:1px solid #dfe7f5; border-radius:8px; background:#f8fbff; text-align:center; cursor:pointer; }
      .person-type-options label.selected { border-color:#204a99; background:#edf4ff; color:#204a99; }
      .person-type-options input { width:auto; min-height:auto; margin:0; padding:0; accent-color:#204a99; }
      .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:.8rem; }
      .event-type-fieldset { min-width:0; margin:0; padding:0; border:0; }
      .event-type-fieldset legend { margin-bottom:.45rem; color:#1f2d3d; font-weight:600; }
      .event-type-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; }
      .event-type-options label { min-height:2.8rem; display:flex; align-items:center; justify-content:center; gap:.4rem; padding:.55rem; border:1px solid #dfe7f5; border-radius:8px; background:#f8fbff; text-align:center; cursor:pointer; }
      .event-type-options label.selected { border-color:#204a99; background:#edf4ff; color:#204a99; }
      .event-type-options input { width:auto; min-height:auto; margin:0; padding:0; accent-color:#204a99; }
      input, select, textarea { width:100%; border:1px solid #dfe7f5; border-radius:12px; padding:.8rem .9rem; font:inherit; background:#f8fbff; }
      .field-hint, .event-list small { color:#66758a; font-size:.72rem; }
      .event-list small { display:block; margin-top:.2rem; }
      .event-note { overflow-wrap:anywhere; }
      .lookup-results { display:grid; gap:.4rem; max-height:12rem; overflow:auto; }
      .lookup-results button { display:grid; gap:.2rem; padding:.65rem .75rem; border:1px solid #dfe7f5; border-radius:8px; background:#fff; color:#1f2d3d; text-align:left; cursor:pointer; }
      .lookup-results button.selected { border-color:#204a99; background:#edf4ff; }
      .lookup-results small, .lookup-empty { color:#66758a; font-size:.72rem; }
      .lookup-empty { margin:0; }
      .field-error { color:#a63143; font-size:.72rem; }
      .selection-summary { display:flex; flex-wrap:wrap; align-items:center; gap:.3rem .7rem; padding:.65rem .75rem; border-left:3px solid #31805b; background:#f0f8f3; font-size:.78rem; }
      .selection-summary span { width:100%; color:#52627a; font-size:.68rem; }
      .selection-summary button { margin-left:auto; border:0; background:none; color:#204a99; font:inherit; cursor:pointer; }
      .primary-action { border:none; background:#204a99; color:white; padding:.85rem 1rem; border-radius:12px; cursor:pointer; }
      .primary-action:disabled { opacity:.6; cursor:not-allowed; }
      .history-header { display:flex; justify-content:space-between; align-items:center; }
      .event-list { list-style:none; padding:0; margin:0; display:grid; align-content:start; gap:.9rem; }
      .event-list li { display:grid; grid-template-columns:auto 1fr auto; gap:.75rem; align-items:center; padding:.75rem; background:#f4f7ff; border-radius:12px; }
      .event-badge { padding:.35rem .65rem; border-radius:999px; font-size:.72rem; font-weight:700; }
      .event-badge.entry { background:#dcfce7; color:#166534; }
      .event-badge.exit { background:#dbeafe; color:#1d4ed8; }
      .event-badge.denied { background:#fee2e2; color:#b91c1c; }
      .status-pill { background:#edf2ff; color:#29467d; padding:.3rem .55rem; border-radius:999px; font-size:.72rem; }
      .status-pill.rejected { background:#fee2e2; color:#991b1b; }
      .notice { padding:.8rem 1rem; border-radius:12px; font-weight:600; }
      .notice.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
      .notice.success { background:#effaf3; color:#23613c; border:1px solid #bfe4cb; }
      .loading-state, .empty-state { color:#52627a; padding:1rem 0; }
      @media (max-width: 900px) { .panel-grid { grid-template-columns: 1fr; } }
      @media (max-width: 560px) { .form-grid { grid-template-columns:1fr; } .event-type-options label { font-size:.78rem; } }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlAccesosPage implements OnInit {
  private readonly accessApi = inject(AccessControlApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly personSearch = new FormControl('', { nonNullable: true });
  readonly unitSearch = new FormControl('', { nonNullable: true });

  readonly form = new FormGroup({
    person_mode: new FormControl<'registered' | 'visitor'>('registered', { nonNullable: true }),
    person_id: new FormControl<number | null>(null),
    visitor_name: new FormControl('', { nonNullable: true }),
    visitor_document_number: new FormControl('', { nonNullable: true }),
    unit_id: new FormControl<number | null>(null, Validators.required),
    event_type: new FormControl<AccessEventType>('ENTRY', { nonNullable: true }),
    validation_method: new FormControl<AccessEventMethod>('MANUAL', { nonNullable: true }),
    validation_result: new FormControl<AccessEventResult>('APPROVED', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly events = signal<AccessEventItem[]>([]);
  readonly people = signal<AccessPersonOption[]>([]);
  readonly units = signal<AccessUnitOption[]>([]);
  readonly selectedPerson = signal<AccessPersonOption | null>(null);
  readonly selectedUnit = signal<AccessUnitOption | null>(null);
  readonly searchingPeople = signal(false);
  readonly searchingUnits = signal(false);
  readonly totalEvents = computed(() => this.events().length);

  ngOnInit(): void {
    this.configurePersonMode('registered');
    this.loadRecent();
    this.personSearch.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          const search = term.trim();
          if (search.length < 2) {
            this.people.set([]);
            this.searchingPeople.set(false);
            return of({ results: [] as AccessPersonOption[] });
          }
          this.searchingPeople.set(true);
          return this.accessApi.searchPeople(search).pipe(
            finalize(() => this.searchingPeople.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.people.set(response.results),
        error: () => {
          this.people.set([]);
          this.error.set('No se pudo buscar personas registradas.');
        },
      });
    this.unitSearch.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          const search = term.trim();
          if (!search) {
            this.units.set([]);
            this.searchingUnits.set(false);
            return of({ results: [] as AccessUnitOption[] });
          }
          this.searchingUnits.set(true);
          return this.accessApi.searchUnits(search).pipe(
            finalize(() => this.searchingUnits.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.units.set(response.results),
        error: () => {
          this.units.set([]);
          this.error.set('No se pudo buscar casas o unidades.');
        },
      });
  }

  onPersonModeChange(): void {
    const mode = this.form.controls.person_mode.value;
    this.configurePersonMode(mode);
    this.selectedPerson.set(null);
    this.people.set([]);
    this.personSearch.setValue('');
    this.form.patchValue({ person_id: null, visitor_name: '', visitor_document_number: '' });
  }

  private configurePersonMode(mode: 'registered' | 'visitor'): void {
    const personId = this.form.controls.person_id;
    const visitorName = this.form.controls.visitor_name;
    const visitorDocument = this.form.controls.visitor_document_number;
    if (mode === 'registered') {
      personId.setValidators([Validators.required, Validators.min(1)]);
      visitorName.clearValidators();
      visitorDocument.clearValidators();
    } else {
      personId.clearValidators();
      visitorName.setValidators([Validators.required, Validators.maxLength(220)]);
      visitorDocument.setValidators([Validators.required, Validators.maxLength(30)]);
    }
    personId.updateValueAndValidity();
    visitorName.updateValueAndValidity();
    visitorDocument.updateValueAndValidity();
  }

  selectPerson(person: AccessPersonOption): void {
    this.selectedPerson.set(person);
    this.form.controls.person_id.setValue(person.id);
  }

  clearSelectedPerson(): void {
    this.selectedPerson.set(null);
    this.form.controls.person_id.setValue(null);
  }

  selectUnit(unit: AccessUnitOption): void {
    this.selectedUnit.set(unit);
    this.form.controls.unit_id.setValue(unit.id);
  }

  clearSelectedUnit(): void {
    this.selectedUnit.set(null);
    this.form.controls.unit_id.setValue(null);
  }

  unitCodes(units: Array<{ id: number; code: string }>): string {
    return units.map((unit) => unit.code).join(', ');
  }

  onEventTypeChange(): void {
    const eventType = this.form.controls.event_type.value;
    this.form.controls.validation_result.setValue(
      eventType === 'DENIED' ? 'REJECTED' : 'APPROVED',
    );
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
    this.success.set(null);

    this.accessApi
      .create({
        ...(value.person_mode === 'registered'
          ? { person_id: Number(value.person_id) }
          : {
              visitor_name: value.visitor_name.trim(),
              visitor_document_number: value.visitor_document_number.trim(),
            }),
        unit_id: Number(value.unit_id),
        event_type: value.event_type,
        validation_method: value.validation_method,
        validation_result:
          value.event_type === 'DENIED' ? 'REJECTED' : 'APPROVED',
        notes: value.notes,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (created) => {
          this.events.update((current) => [created, ...current].slice(0, 10));
          this.success.set(
            `Evento “${created.event_type_display}” guardado para ${created.person?.full_name ?? created.visitor_name}.`,
          );
          this.form.reset({
            person_mode: 'registered',
            person_id: null,
            visitor_name: '',
            visitor_document_number: '',
            unit_id: null,
            event_type: 'ENTRY',
            validation_method: 'MANUAL',
            validation_result: 'APPROVED',
            notes: '',
          });
          this.configurePersonMode('registered');
          this.selectedPerson.set(null);
          this.selectedUnit.set(null);
          this.personSearch.setValue('');
          this.unitSearch.setValue('');
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
