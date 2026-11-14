import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { AreasApi } from './areas.api';
import {
  AREA_STATUS_LABELS,
  AreaBlock,
  AreaSchedule,
  AreaStatus,
  CommonArea,
  Reservation,
} from './areas.models';

type CalendarioTab = 'calendar' | 'areas' | 'schedules' | 'blocks';

interface AreaForm {
  name: string;
  capacity: string;
  status: AreaStatus;
  description: string;
  requires_approval: boolean;
}

interface ScheduleForm {
  common_area: string;
  weekday: string;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
}

interface BlockForm {
  common_area: string;
  blocked_from: string;
  blocked_until: string;
  reason: string;
}

interface CalendarEvent {
  id: string;
  kind: 'block' | 'reservation';
  date: string;
  areaId: number;
  areaName: string;
  title: string;
  subtitle: string;
  status: 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'BLOCKED';
}

interface CalendarDay {
  date: Date;
  iso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const EMPTY_AREA_FORM: AreaForm = { name: '', capacity: '', status: 'AVAILABLE', description: '', requires_approval: false };
const EMPTY_SCHEDULE_FORM: ScheduleForm = { common_area: '', weekday: '0', opens_at: '08:00', closes_at: '22:00', is_active: true };
const EMPTY_BLOCK_FORM: BlockForm = { common_area: '', blocked_from: '', blocked_until: '', reason: '' };

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'taji-calendario-page',
  imports: [IconComponent, FormsModule],
  templateUrl: './calendario.page.html',
  styleUrl: './calendario.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioPage implements OnInit {
  private readonly api = inject(AreasApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tenantChanged = new Subject<void>();
  private tenantId = this.auth.user()?.active_tenant?.id;

  constructor() {
    // Mismo patrón que mantenimiento: al cambiar de condominio se descartan los
    // datos del tenant anterior y se vuelve a cargar.
    effect(() => {
      const tenantId = this.auth.user()?.active_tenant?.id;
      if (tenantId === this.tenantId) return;
      this.tenantId = tenantId;
      untracked(() => {
        this.tenantChanged.next();
        this.areas.set([]);
        this.schedules.set([]);
        this.blocks.set([]);
        this.reservations.set([]);
        this.areaFormOpen.set(false);
        this.scheduleFormOpen.set(false);
        this.blockFormOpen.set(false);
        this.eventDetail.set(null);
        this.currentPage.set(1);
        this.errorMessage.set('');
        this.successMessage.set('');
        if (tenantId) this.refreshAll();
      });
    });
  }

  readonly user = this.auth.user;
  readonly canManage = computed(() => {
    const user = this.user();
    return !!user?.is_superuser || !!user?.role?.permissions?.includes('manage_reservations');
  });

  readonly activeTab = signal<CalendarioTab>('calendar');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly areas = signal<CommonArea[]>([]);
  readonly schedules = signal<AreaSchedule[]>([]);
  readonly blocks = signal<AreaBlock[]>([]);
  readonly reservations = signal<Reservation[]>([]);

  readonly currentPage = signal(1);
  readonly areasPerPage = 8;

  // --- Calendario ------------------------------------------------------------

  readonly monthCursor = signal(startOfMonth(new Date()));
  readonly calendarArea = signal<number | null>(null);
  readonly eventDetail = signal<CalendarEvent | null>(null);

  readonly monthLabel = computed(() => {
    const cursor = this.monthCursor();
    return `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  });

  readonly areasDisponibles = computed(() => this.areas().filter((area) => area.status === 'AVAILABLE').length);
  readonly horariosConfigurados = computed(() => this.schedules().length);
  readonly bloqueosProximos = computed(() => {
    const now = Date.now();
    return this.blocks().filter((block) => new Date(block.blocked_until).getTime() >= now).length;
  });

  readonly reservasDelMes = computed(() => {
    const cursor = this.monthCursor();
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();
    return this.reservations().filter((reservation) => {
      if (reservation.status === 'REJECTED' || reservation.status === 'CANCELLED') return false;
      const time = new Date(reservation.start_at).getTime();
      return time >= start && time < end;
    });
  });

  readonly reservasVisibles = computed(() => {
    const area = this.calendarArea();
    return this.reservasDelMes().filter((reservation) => area === null || reservation.common_area === area);
  });

  readonly calendarEvents = computed<CalendarEvent[]>(() => {
    const area = this.calendarArea();
    const events: CalendarEvent[] = [];

    for (const block of this.blocks()) {
      if (area !== null && block.common_area !== area) continue;
      const areaName = this.areaName(block.common_area);
      const start = new Date(block.blocked_from);
      const end = new Date(block.blocked_until);
      for (const iso of daysBetween(start, end)) {
        events.push({
          id: `block-${block.id}-${iso}`,
          kind: 'block',
          date: iso,
          areaId: block.common_area,
          areaName,
          title: `Bloqueado · ${areaName}`,
          subtitle: block.reason,
          status: 'BLOCKED',
        });
      }
    }

    for (const reservation of this.reservations()) {
      if (area !== null && reservation.common_area !== area) continue;
      if (reservation.status === 'REJECTED' || reservation.status === 'CANCELLED') continue;
      const start = new Date(reservation.start_at);
      const end = new Date(reservation.end_at);
      events.push({
        id: `reservation-${reservation.id}`,
        kind: 'reservation',
        date: toIsoDate(start),
        areaId: reservation.common_area,
        areaName: reservation.common_area_name || this.areaName(reservation.common_area),
        title: `${toTimeLabel(start)}–${toTimeLabel(end)} · ${reservation.common_area_name || this.areaName(reservation.common_area)}`,
        subtitle: reservation.purpose ? `${reservation.resident_name} · ${reservation.purpose}` : reservation.resident_name,
        status: reservation.status === 'PENDING' ? 'PENDING' : reservation.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED',
      });
    }

    return events;
  });

  readonly weeks = computed<CalendarDay[][]>(() => {
    const cursor = this.monthCursor();
    const firstDay = startOfMonth(cursor);
    // Semana iniciando en lunes (ISO).
    const offset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - offset);

    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const event of this.calendarEvents()) {
      const list = eventsByDate.get(event.date) ?? [];
      list.push(event);
      eventsByDate.set(event.date, list);
    }

    const todayIso = toIsoDate(new Date());
    const weeks: CalendarDay[][] = [];
    const cursorDate = new Date(gridStart);
    while (weeks.length < 6) {
      const week: CalendarDay[] = [];
      let outsideMonthDays = 0;
      for (let day = 0; day < 7; day++) {
        const date = new Date(cursorDate);
        const iso = toIsoDate(date);
        const inMonth = date.getMonth() === cursor.getMonth();
        if (!inMonth) outsideMonthDays += 1;
        week.push({
          date,
          iso,
          dayOfMonth: date.getDate(),
          inCurrentMonth: inMonth,
          isToday: iso === todayIso,
          events: eventsByDate.get(iso) ?? [],
        });
        cursorDate.setDate(cursorDate.getDate() + 1);
      }
      if (outsideMonthDays === 7 && weeks.length > 0) break;
      weeks.push(week);
      // Termina cuando la grilla cubrió todo el mes y completó la semana.
      if (cursorDate.getMonth() !== cursor.getMonth() && cursorDate.getDay() === 1) break;
    }
    return weeks;
  });

  readonly upcomingBlocks = computed(() =>
    [...this.blocks()]
      .filter((block) => new Date(block.blocked_until).getTime() >= Date.now())
      .sort((a, b) => new Date(a.blocked_from).getTime() - new Date(b.blocked_from).getTime())
      .slice(0, 5),
  );

  // --- Formularios y modales ---------------------------------------------------

  readonly areaFormOpen = signal(false);
  readonly editingArea = signal<CommonArea | null>(null);
  areaForm: AreaForm = { ...EMPTY_AREA_FORM };

  readonly scheduleFormOpen = signal(false);
  readonly editingSchedule = signal<AreaSchedule | null>(null);
  scheduleForm: ScheduleForm = { ...EMPTY_SCHEDULE_FORM };
  readonly selectedScheduleArea = signal<number | null>(null);

  readonly blockFormOpen = signal(false);
  readonly editingBlock = signal<AreaBlock | null>(null);
  blockForm: BlockForm = { ...EMPTY_BLOCK_FORM };

  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly weekdayShort = WEEKDAY_SHORT;

  readonly paginatedAreas = computed(() => {
    const all = this.areas();
    const start = (this.currentPage() - 1) * this.areasPerPage;
    return all.slice(start, start + this.areasPerPage);
  });
  readonly areasTotalPages = computed(() => Math.max(1, Math.ceil(this.areas().length / this.areasPerPage)));

  readonly schedulesForArea = computed(() => {
    const areaId = this.selectedScheduleArea();
    if (areaId === null) return [];
    return [...this.schedules()]
      .filter((schedule) => schedule.common_area === areaId)
      .sort((a, b) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at));
  });

  readonly sortedBlocks = computed(() =>
    [...this.blocks()].sort(
      (a, b) => new Date(b.blocked_from).getTime() - new Date(a.blocked_from).getTime(),
    ),
  );

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.errorMessage.set('');
    this.loading.set(true);
    forkJoin({
      areas: this.api.listAreas(),
      schedules: this.api.listSchedules(),
      blocks: this.api.listBlocks(),
      reservations: this.api.listReservations(),
    })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ areas, schedules, blocks, reservations }) => {
          this.areas.set(areas);
          this.schedules.set(schedules);
          this.blocks.set(blocks);
          this.reservations.set(reservations);
          if (this.selectedScheduleArea() === null && areas.length > 0) {
            this.selectedScheduleArea.set(areas[0].id);
          }
          const maxPage = Math.max(1, Math.ceil(areas.length / this.areasPerPage));
          if (this.currentPage() > maxPage) this.currentPage.set(maxPage);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.errorText(error, 'No se pudieron cargar las áreas comunes.'));
        },
      });
  }

  // --- Calendario ---------------------------------------------------------------

  setCalendarArea(value: string): void {
    this.calendarArea.set(value === '' ? null : Number(value));
  }

  previousMonth(): void {
    const cursor = this.monthCursor();
    this.monthCursor.set(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const cursor = this.monthCursor();
    this.monthCursor.set(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  }

  goToToday(): void {
    this.monthCursor.set(startOfMonth(new Date()));
  }

  openEventDetail(event: CalendarEvent): void {
    this.eventDetail.set(event);
  }

  eventStatusLabel(status: CalendarEvent['status']): string {
    switch (status) {
      case 'CONFIRMED': return 'Confirmada';
      case 'PENDING': return 'Pendiente';
      case 'COMPLETED': return 'Completada';
      case 'BLOCKED': return 'Bloqueada';
    }
  }

  // --- Áreas comunes --------------------------------------------------------------

  openCreateArea(): void {
    this.editingArea.set(null);
    this.areaForm = { ...EMPTY_AREA_FORM };
    this.areaFormOpen.set(true);
  }

  openEditArea(area: CommonArea): void {
    this.editingArea.set(area);
    this.areaForm = {
      name: area.name,
      capacity: area.capacity === null || area.capacity === undefined ? '' : String(area.capacity),
      status: area.status,
      description: area.description ?? '',
      requires_approval: !!area.requires_approval,
    };
    this.areaFormOpen.set(true);
  }

  saveArea(): void {
    if (!this.canManage()) return;
    const name = this.areaForm.name.trim();
    if (!name) {
      this.errorMessage.set('El nombre del área es obligatorio.');
      return;
    }
    const capacity = this.areaForm.capacity === '' ? null : Number(this.areaForm.capacity);
    // El modelo exige capacity > 0 (chk_common_area_capacity) o null.
    if (capacity !== null && (!Number.isFinite(capacity) || capacity < 1 || !Number.isInteger(capacity))) {
      this.errorMessage.set('La capacidad debe ser un número entero mayor o igual a 1.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const payload = {
      name,
      capacity,
      status: this.areaForm.status,
      description: this.areaForm.description.trim(),
      requires_approval: this.areaForm.requires_approval,
      sector: this.editingArea()?.sector ?? null,
    };
    const editing = this.editingArea();
    const request$ = editing
      ? this.api.updateArea(editing.id, payload)
      : this.api.createArea(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.areaFormOpen.set(false);
        this.successMessage.set(editing ? 'Área actualizada correctamente.' : 'Área creada correctamente.');
        this.refreshAll();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.errorText(error, 'No se pudo guardar el área.'));
      },
    });
  }

  toggleAreaStatus(area: CommonArea): void {
    if (!this.canManage()) return;
    const next: AreaStatus = area.status === 'INACTIVE' ? 'AVAILABLE' : 'INACTIVE';
    const action = next === 'AVAILABLE' ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Deseas ${action} el área "${area.name}"?`)) return;

    this.saving.set(true);
    this.errorMessage.set('');
    this.api
      .setAreaStatus(area.id, next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(next === 'AVAILABLE' ? 'Área activada.' : 'Área desactivada.');
          this.refreshAll();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.errorText(error, 'No se pudo cambiar el estado del área.'));
        },
      });
  }

  changePage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.areasTotalPages()));
  }

  // --- Horarios semanales -----------------------------------------------------------

  setSelectedScheduleArea(value: string): void {
    this.selectedScheduleArea.set(value === '' ? null : Number(value));
  }

  openCreateSchedule(): void {
    const area = this.selectedScheduleArea() ?? this.areas()[0]?.id ?? null;
    this.editingSchedule.set(null);
    this.scheduleForm = { ...EMPTY_SCHEDULE_FORM, common_area: area === null ? '' : String(area) };
    this.scheduleFormOpen.set(true);
  }

  openEditSchedule(schedule: AreaSchedule): void {
    this.editingSchedule.set(schedule);
    this.scheduleForm = {
      common_area: String(schedule.common_area),
      weekday: String(schedule.weekday),
      opens_at: timeLabel(schedule.opens_at),
      closes_at: timeLabel(schedule.closes_at),
      is_active: schedule.is_active,
    };
    this.scheduleFormOpen.set(true);
  }

  saveSchedule(): void {
    if (!this.canManage()) return;
    const commonArea = Number(this.scheduleForm.common_area);
    if (!Number.isFinite(commonArea) || commonArea <= 0) {
      this.errorMessage.set('Selecciona el área del horario.');
      return;
    }
    if (this.scheduleForm.opens_at >= this.scheduleForm.closes_at) {
      this.errorMessage.set('La hora de apertura debe ser anterior a la hora de cierre.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const payload = {
      common_area: commonArea,
      weekday: Number(this.scheduleForm.weekday),
      opens_at: this.scheduleForm.opens_at,
      closes_at: this.scheduleForm.closes_at,
      is_active: this.scheduleForm.is_active,
    };
    const editing = this.editingSchedule();
    const request$ = editing
      ? this.api.updateSchedule(editing.id, payload)
      : this.api.createSchedule(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.scheduleFormOpen.set(false);
        this.successMessage.set(editing ? 'Horario actualizado.' : 'Horario creado.');
        this.refreshAll();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.errorText(error, 'No se pudo guardar el horario.'));
      },
    });
  }

  /**
   * El backend no borra horarios: los marca como inactivos (204 + is_active=false).
   */
  deleteSchedule(schedule: AreaSchedule): void {
    if (!this.canManage()) return;
    if (!window.confirm(`¿Desactivar el horario del ${WEEKDAY_LABELS[schedule.weekday] ?? 'día'} ${timeLabel(schedule.opens_at)}–${timeLabel(schedule.closes_at)}?`)) return;

    this.saving.set(true);
    this.api
      .deleteSchedule(schedule.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set('Horario desactivado.');
          this.refreshAll();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.errorText(error, 'No se pudo desactivar el horario.'));
        },
      });
  }

  // --- Bloqueos temporales --------------------------------------------------------------

  openCreateBlock(): void {
    this.editingBlock.set(null);
    const area = this.selectedScheduleArea() ?? this.areas()[0]?.id ?? null;
    this.blockForm = { ...EMPTY_BLOCK_FORM, common_area: area === null ? '' : String(area) };
    this.blockFormOpen.set(true);
  }

  openEditBlock(block: AreaBlock): void {
    this.editingBlock.set(block);
    this.blockForm = {
      common_area: String(block.common_area),
      blocked_from: toDateTimeLocalValue(block.blocked_from),
      blocked_until: toDateTimeLocalValue(block.blocked_until),
      reason: block.reason ?? '',
    };
    this.blockFormOpen.set(true);
  }

  saveBlock(): void {
    if (!this.canManage()) return;
    const commonArea = Number(this.blockForm.common_area);
    if (!Number.isFinite(commonArea) || commonArea <= 0) {
      this.errorMessage.set('Selecciona el área a bloquear.');
      return;
    }
    const reason = this.blockForm.reason.trim();
    if (!reason) {
      this.errorMessage.set('Describe el motivo del bloqueo (por ejemplo, mantenimiento).');
      return;
    }
    if (reason.length > 240) {
      this.errorMessage.set('El motivo no puede superar los 240 caracteres.');
      return;
    }
    const start = new Date(this.blockForm.blocked_from);
    const end = new Date(this.blockForm.blocked_until);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      this.errorMessage.set('Indica la fecha y hora de inicio y de fin del bloqueo.');
      return;
    }
    if (end <= start) {
      this.errorMessage.set('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const payload = {
      common_area: commonArea,
      blocked_from: start.toISOString(),
      blocked_until: end.toISOString(),
      reason,
    };
    const editing = this.editingBlock();
    const request$ = editing
      ? this.api.updateBlock(editing.id, payload)
      : this.api.createBlock(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.blockFormOpen.set(false);
        this.successMessage.set(editing ? 'Bloqueo actualizado.' : 'Bloqueo creado.');
        this.refreshAll();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.errorText(error, 'No se pudo guardar el bloqueo.'));
      },
    });
  }

  deleteBlock(block: AreaBlock): void {
    if (!this.canManage()) return;
    if (!window.confirm(`¿Eliminar el bloqueo "${block.reason}" del área ${this.areaName(block.common_area)}?`)) return;

    this.saving.set(true);
    this.api
      .deleteBlock(block.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set('Bloqueo eliminado.');
          this.refreshAll();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.errorText(error, 'No se pudo eliminar el bloqueo.'));
        },
      });
  }

  // --- Utilidades de presentación -----------------------------------------------------

  areaName(areaId: number): string {
    return this.areas().find((area) => area.id === areaId)?.name ?? `Área #${areaId}`;
  }

  areaStatusLabel(status: AreaStatus): string {
    return AREA_STATUS_LABELS[status] ?? status;
  }

  weekdayLabel(weekday: number): string {
    return WEEKDAY_LABELS[weekday] ?? `Día ${weekday}`;
  }

  timeLabel(value: string | null | undefined): string {
    return timeLabel(value);
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
  }

  private errorText(error: unknown, fallback: string): string {
    return apiErrorMessage(error, fallback);
  }
}

function timeLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

function toTimeLabel(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Todas las fechas YYYY-MM-DD locales cubiertas por [start, end]. */
function daysBetween(start: Date, end: Date): string[] {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let guard = 0;
  while (cursor <= last && guard < 62) {
    days.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return days;
}

/** Convierte un ISO a valor para <input type="datetime-local"> en hora local. */
function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
