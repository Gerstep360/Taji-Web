import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, of, switchMap, catchError, takeUntil } from 'rxjs';

import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ReservasApi, ReservationAction } from './reservas.api';
import {
  CalendarItem,
  PositionedItem,
  addDays,
  fromDateKey,
  layoutDay,
  localDateTimeToIso,
  pad,
  startOfWeek,
  timeToMinutes,
  toDateKey,
  toTimeKey,
} from './reservas.calendar';
import {
  AreaAvailability,
  AreaBlock,
  Reservation,
  ReservationStatus,
  ReservationSummary,
  ReservableArea,
  ResidentOption,
  STATUS_LABELS,
  TimeRange,
  WEEKDAY_LABELS,
} from './reservas.models';

type Tab = 'calendar' | 'pending' | 'history';

interface CalendarEntry {
  kind: 'reservation' | 'block';
  reservation?: Reservation;
  block?: AreaBlock;
}

interface DayColumn {
  key: string;
  date: Date;
  isToday: boolean;
  items: PositionedItem<CalendarEntry>[];
  agenda: CalendarEntry[];
}

interface CreateForm {
  common_area: number | null;
  resident: ResidentOption | null;
  date: string;
  start: string;
  end: string;
  purpose: string;
}

const PX_PER_MINUTE = 0.9;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;
const HIDDEN_BY_DEFAULT: ReservationStatus[] = ['CANCELLED', 'REJECTED'];

type DateStyle = 'weekday' | 'day' | 'month' | 'dayMonthTime' | 'shortDate' | 'longDate' | 'dateTime';

const DATE_FORMATS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  weekday: { weekday: 'short' },
  day: { day: 'numeric' },
  month: { month: 'short' },
  dayMonthTime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false },
  shortDate: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  longDate: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false },
};

@Component({
  selector: 'taji-reservas-page',
  imports: [FormsModule, IconComponent],
  templateUrl: './reservas.page.html',
  styleUrl: './reservas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservasPage {
  private readonly api = inject(ReservasApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tenantChanged = new Subject<void>();
  private readonly residentSearch$ = new Subject<string>();
  private tenantId: number | string | undefined = undefined;

  readonly statusLabels = STATUS_LABELS;
  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly pxPerMinute = PX_PER_MINUTE;

  readonly tab = signal<Tab>('calendar');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly areas = signal<ReservableArea[]>([]);
  readonly summary = signal<ReservationSummary | null>(null);

  // Calendario
  readonly weekStart = signal(startOfWeek(new Date()));
  readonly areaFilter = signal<number | null>(null);
  readonly showClosed = signal(false);
  readonly calendarReservations = signal<Reservation[]>([]);
  readonly calendarBlocks = signal<AreaBlock[]>([]);
  readonly now = signal(new Date());

  // Pendientes e historial
  readonly pending = signal<Reservation[]>([]);
  readonly history = signal<Reservation[]>([]);
  readonly historyPage = signal(1);
  readonly historyPages = signal(1);
  readonly historyTotal = signal(0);
  historyStatus = '';
  historyArea = '';
  historySearch = '';
  historyWhen: '' | 'upcoming' | 'past' = '';

  // Detalle y acciones
  readonly selected = signal<Reservation | null>(null);
  readonly actionMode = signal<'reject' | 'cancel' | null>(null);
  reasonText = '';

  // Nueva reserva
  readonly createOpen = signal(false);
  readonly availability = signal<AreaAvailability | null>(null);
  readonly availabilityLoading = signal(false);
  readonly residentOptions = signal<ResidentOption[]>([]);
  residentQuery = '';
  form: CreateForm = this.emptyForm();

  readonly canManage = computed(() => {
    const user = this.auth.user();
    return !!user?.is_superuser || !!user?.role?.permissions.includes('manage_reservations');
  });

  readonly weekDays = computed(() => Array.from({ length: 7 }, (_, i) => addDays(this.weekStart(), i)));
  readonly weekLabel = computed(() => {
    const days = this.weekDays();
    const first = days[0];
    const last = days[6];
    const fmt = (d: Date, withYear: boolean) =>
      d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
    return `${fmt(first, first.getFullYear() !== last.getFullYear())} – ${fmt(last, true)}`;
  });
  readonly isCurrentWeek = computed(() => toDateKey(this.weekStart()) === toDateKey(startOfWeek(new Date())));

  readonly bookableAreas = computed(() => this.areas().filter(area => area.bookable));

  readonly visibleReservations = computed(() => {
    const hidden = this.showClosed() ? [] : HIDDEN_BY_DEFAULT;
    return this.calendarReservations().filter(item => !hidden.includes(item.status));
  });

  /** Rango horario visible: horarios de las áreas mostradas, ampliado si hay eventos fuera. */
  readonly hourRange = computed(() => {
    const filter = this.areaFilter();
    const areas = this.areas().filter(area => filter === null || area.id === filter);
    let start = Number.POSITIVE_INFINITY;
    let end = Number.NEGATIVE_INFINITY;
    for (const area of areas) {
      for (const schedule of area.schedules) {
        start = Math.min(start, Math.floor(timeToMinutes(schedule.opens_at) / 60));
        end = Math.max(end, Math.ceil(timeToMinutes(schedule.closes_at) / 60));
      }
    }
    if (!Number.isFinite(start)) {
      start = DEFAULT_START_HOUR;
      end = DEFAULT_END_HOUR;
    }
    for (const item of this.visibleReservations()) {
      const s = new Date(item.start_at);
      const e = new Date(item.end_at);
      start = Math.min(start, s.getHours());
      end = Math.max(end, e.getDate() !== s.getDate() ? 24 : Math.ceil(e.getHours() + e.getMinutes() / 60));
    }
    return { start: Math.max(0, start), end: Math.min(24, Math.max(end, start + 1)) };
  });

  readonly hours = computed(() => {
    const { start, end } = this.hourRange();
    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  readonly gridHeight = computed(() => (this.hourRange().end - this.hourRange().start) * 60 * PX_PER_MINUTE);

  readonly columns = computed<DayColumn[]>(() => {
    const { start, end } = this.hourRange();
    const todayKey = toDateKey(this.now());
    const entries: CalendarItem<CalendarEntry>[] = [
      ...this.visibleReservations().map(reservation => ({
        key: `r-${reservation.id}`,
        start: new Date(reservation.start_at),
        end: new Date(reservation.end_at),
        data: { kind: 'reservation' as const, reservation },
      })),
      ...this.calendarBlocks().map(block => ({
        key: `b-${block.id}`,
        start: new Date(block.blocked_from),
        end: new Date(block.blocked_until),
        data: { kind: 'block' as const, block },
      })),
    ];
    return this.weekDays().map(date => {
      const dayStart = date.getTime();
      const dayEnd = addDays(date, 1).getTime();
      const agenda = entries
        .filter(entry => entry.start.getTime() < dayEnd && entry.end.getTime() > dayStart)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map(entry => entry.data);
      return {
        key: toDateKey(date),
        date,
        isToday: toDateKey(date) === todayKey,
        items: layoutDay(entries, date, start * 60, end * 60),
        agenda,
      };
    });
  });

  readonly nowOffset = computed(() => {
    const now = this.now();
    const minutes = now.getHours() * 60 + now.getMinutes() - this.hourRange().start * 60;
    const max = (this.hourRange().end - this.hourRange().start) * 60;
    return minutes >= 0 && minutes <= max ? minutes * PX_PER_MINUTE : null;
  });

  readonly historyStatuses: ReservationStatus[] = ['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED'];

  /** Fechas en español sin depender del locale global de Angular. */
  fmt(value: string | null | undefined, style: DateStyle): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('es-BO', DATE_FORMATS[style]).replace('.', '');
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status as ReservationStatus] ?? status;
  }

  selectedArea(): ReservableArea | null {
    return this.areas().find(area => area.id === this.form.common_area) ?? null;
  }

  constructor() {
    effect(() => {
      const tenantId = this.auth.user()?.active_tenant?.id;
      if (tenantId === this.tenantId) return;
      this.tenantId = tenantId;
      untracked(() => {
        this.tenantChanged.next();
        this.resetState();
        if (tenantId) this.loadAll();
      });
    });

    this.residentSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => this.api.residents(query).pipe(catchError(() => of([] as ResidentOption[])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(options => this.residentOptions.set(options));

    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  // ------------------------------------------------------------------ carga
  private resetState() {
    this.areas.set([]);
    this.summary.set(null);
    this.calendarReservations.set([]);
    this.calendarBlocks.set([]);
    this.pending.set([]);
    this.history.set([]);
    this.selected.set(null);
    this.createOpen.set(false);
    this.areaFilter.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  loadAll() {
    this.loading.set(true);
    forkJoin({ areas: this.api.listAreas(), summary: this.api.summary() })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ areas, summary }) => {
          this.areas.set(areas.results);
          this.summary.set(summary);
          this.loadTab();
        },
        error: error => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos cargar las reservas.'));
        },
      });
  }

  private refreshSummary() {
    this.api.summary()
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: summary => this.summary.set(summary), error: () => undefined });
  }

  loadTab() {
    const tab = this.tab();
    if (tab === 'calendar') this.loadCalendar();
    else if (tab === 'pending') this.loadPending();
    else this.loadHistory();
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    this.loadTab();
  }

  loadCalendar() {
    const days = this.weekDays();
    this.loading.set(true);
    this.now.set(new Date());
    this.api.calendar(toDateKey(days[0]), toDateKey(days[6]), this.areaFilter())
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.calendarReservations.set(data.reservations);
          this.calendarBlocks.set(data.blocks);
          this.loading.set(false);
        },
        error: error => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos cargar el calendario.'));
        },
      });
  }

  loadPending() {
    this.loading.set(true);
    this.api.listReservations({ status: 'PENDING', ordering: 'start_at', page_size: 100 })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.pending.set(page.results);
          this.loading.set(false);
        },
        error: error => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos cargar las solicitudes.'));
        },
      });
  }

  loadHistory(page = this.historyPage()) {
    this.loading.set(true);
    this.api.listReservations({
      status: this.historyStatus,
      common_area: this.historyArea,
      search: this.historySearch.trim(),
      when: this.historyWhen,
      ordering: this.historyWhen === 'upcoming' ? 'start_at' : '-start_at',
      page,
      page_size: 20,
    })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.history.set(result.results);
          this.historyPage.set(result.pagination.page);
          this.historyPages.set(Math.max(1, result.pagination.total_pages));
          this.historyTotal.set(result.pagination.total_items);
          this.loading.set(false);
        },
        error: error => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos cargar el historial.'));
        },
      });
  }

  applyHistoryFilters() {
    this.historyPage.set(1);
    this.loadHistory(1);
  }

  clearHistoryFilters() {
    this.historyStatus = '';
    this.historyArea = '';
    this.historySearch = '';
    this.historyWhen = '';
    this.applyHistoryFilters();
  }

  // ------------------------------------------------------------- calendario
  moveWeek(delta: number) {
    this.weekStart.set(addDays(this.weekStart(), delta * 7));
    this.loadCalendar();
  }

  goToday() {
    this.weekStart.set(startOfWeek(new Date()));
    this.loadCalendar();
  }

  pickWeek(dateKey: string) {
    if (!dateKey) return;
    this.weekStart.set(startOfWeek(fromDateKey(dateKey)));
    this.loadCalendar();
  }

  setAreaFilter(value: string) {
    this.areaFilter.set(value ? Number(value) : null);
    this.loadCalendar();
  }

  eventTop(item: PositionedItem<CalendarEntry>) {
    return item.top * PX_PER_MINUTE;
  }

  eventHeight(item: PositionedItem<CalendarEntry>) {
    return Math.max(item.height * PX_PER_MINUTE - 2, 18);
  }

  eventLeft(item: PositionedItem<CalendarEntry>) {
    return `calc(${(item.lane / item.lanes) * 100}% + 2px)`;
  }

  eventWidth(item: PositionedItem<CalendarEntry>) {
    return `calc(${100 / item.lanes}% - 4px)`;
  }

  timeRange(start: string, end: string) {
    return `${toTimeKey(new Date(start))} – ${toTimeKey(new Date(end))}`;
  }

  /** Clic en un espacio vacío de la grilla: abre "Nueva reserva" con esa fecha/hora. */
  onSlotClick(event: MouseEvent, column: DayColumn) {
    if (event.target !== event.currentTarget) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const minutes = (event.clientY - rect.top) / PX_PER_MINUTE + this.hourRange().start * 60;
    const rounded = Math.floor(minutes / 30) * 30;
    const startMinutes = Math.min(rounded, 23 * 60 + 30);
    const endMinutes = Math.min(startMinutes + 60, 24 * 60 - 1);
    const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    this.openCreate({ date: column.key, start: toTime(startMinutes), end: toTime(endMinutes) });
  }

  // ---------------------------------------------------------------- detalle
  openDetail(reservation: Reservation) {
    this.selected.set(reservation);
    this.actionMode.set(null);
    this.reasonText = '';
  }

  closeDetail() {
    this.selected.set(null);
    this.actionMode.set(null);
    this.reasonText = '';
  }

  startReasonAction(mode: 'reject' | 'cancel') {
    this.actionMode.set(mode);
    this.reasonText = '';
  }

  run(action: ReservationAction, reservation: Reservation | null = this.selected()) {
    if (!reservation || this.saving()) return;
    const reason = this.reasonText.trim();
    if ((action === 'reject' || action === 'cancel') && reason.length < 3) {
      this.errorMessage.set('Escribe un motivo de al menos 3 caracteres.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.api.runAction(reservation.id, action, reason)
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.saving.set(false);
          const messages: Record<ReservationAction, string> = {
            approve: 'Reserva aprobada.',
            reject: 'Reserva rechazada.',
            cancel: 'Reserva cancelada.',
            complete: 'Reserva finalizada.',
          };
          this.successMessage.set(messages[action]);
          if (this.selected()?.id === updated.id) {
            this.selected.set(updated);
            this.actionMode.set(null);
            this.reasonText = '';
          }
          this.refreshSummary();
          this.loadTab();
        },
        error: error => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos actualizar la reserva.'));
          this.loadTab();
        },
      });
  }

  quickApprove(reservation: Reservation) {
    this.reasonText = '';
    this.run('approve', reservation);
  }

  // ---------------------------------------------------------- nueva reserva
  private emptyForm(): CreateForm {
    return { common_area: null, resident: null, date: toDateKey(new Date()), start: '', end: '', purpose: '' };
  }

  openCreate(prefill: Partial<CreateForm> = {}) {
    const defaultArea = this.areaFilter() ?? this.bookableAreas()[0]?.id ?? null;
    this.form = { ...this.emptyForm(), common_area: defaultArea, ...prefill };
    this.residentQuery = '';
    this.residentOptions.set([]);
    this.availability.set(null);
    this.errorMessage.set('');
    this.createOpen.set(true);
    this.loadAvailability();
  }

  closeCreate() {
    this.createOpen.set(false);
  }

  loadAvailability() {
    const area = this.form.common_area;
    if (!area || !this.form.date) {
      this.availability.set(null);
      return;
    }
    this.availabilityLoading.set(true);
    this.api.availability(area, this.form.date)
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.availability.set(data);
          this.availabilityLoading.set(false);
        },
        error: error => {
          this.availability.set(null);
          this.availabilityLoading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos consultar la disponibilidad.'));
        },
      });
  }

  onResidentQuery(value: string) {
    this.residentQuery = value;
    this.form.resident = null;
    if (value.trim().length >= 2) this.residentSearch$.next(value.trim());
    else this.residentOptions.set([]);
  }

  chooseResident(option: ResidentOption) {
    this.form.resident = option;
    this.residentQuery = option.unit ? `${option.full_name} · ${option.unit}` : option.full_name;
    this.residentOptions.set([]);
  }

  useFreeRange(range: TimeRange) {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const proposedEnd = new Date(Math.min(start.getTime() + 60 * 60000, end.getTime()));
    this.form.start = toTimeKey(start);
    this.form.end = proposedEnd.getDate() !== start.getDate() ? '23:59' : toTimeKey(proposedEnd);
  }

  /** Validación local (el servidor vuelve a validar todo). */
  formProblem(): string {
    const f = this.form;
    if (!f.common_area) return 'Selecciona un área.';
    if (!f.resident) return 'Busca y selecciona el residente.';
    if (!f.date || !f.start || !f.end) return 'Completa la fecha y el horario.';
    const minutes = timeToMinutes(f.end) - timeToMinutes(f.start);
    if (minutes <= 0) return 'La hora final debe ser posterior a la inicial.';
    const availability = this.availability();
    if (availability) {
      if (minutes < availability.min_duration_minutes) return `La reserva debe durar al menos ${availability.min_duration_minutes} minutos.`;
      if (minutes > availability.max_duration_minutes) return `La reserva no puede durar más de ${availability.max_duration_minutes / 60} horas.`;
      if (!availability.bookable) return availability.reason;
      const start = new Date(localDateTimeToIso(f.date, f.start)).getTime();
      const end = new Date(localDateTimeToIso(f.date, f.end)).getTime();
      const fits = availability.free.some(r => new Date(r.start).getTime() <= start && end <= new Date(r.end).getTime());
      if (!fits) return 'El horario elegido no está libre. Usa uno de los horarios disponibles.';
    }
    return '';
  }

  submitCreate() {
    const problem = this.formProblem();
    if (problem) {
      this.errorMessage.set(problem);
      return;
    }
    const f = this.form;
    this.saving.set(true);
    this.errorMessage.set('');
    this.api.create({
      common_area: f.common_area!,
      resident: f.resident!.id,
      start_at: localDateTimeToIso(f.date, f.start),
      end_at: localDateTimeToIso(f.date, f.end),
      purpose: f.purpose.trim(),
    })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: created => {
          this.saving.set(false);
          this.createOpen.set(false);
          this.successMessage.set(`Reserva creada para ${created.resident_name} (${created.status_label.toLowerCase()}).`);
          this.weekStart.set(startOfWeek(new Date(created.start_at)));
          this.refreshSummary();
          if (this.tab() !== 'calendar') this.tab.set('calendar');
          this.loadCalendar();
        },
        error: error => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'No pudimos crear la reserva.'));
          this.loadAvailability();
        },
      });
  }

  scheduleText(area: ReservableArea): string {
    if (!area.schedules.length) return 'Sin horario fijo (todo el día)';
    const byDay = new Map<number, string[]>();
    for (const s of area.schedules) {
      const list = byDay.get(s.weekday) ?? [];
      list.push(`${s.opens_at}–${s.closes_at}`);
      byDay.set(s.weekday, list);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, ranges]) => `${WEEKDAY_LABELS[day].slice(0, 3)} ${ranges.join(', ')}`)
      .join(' · ');
  }
}
