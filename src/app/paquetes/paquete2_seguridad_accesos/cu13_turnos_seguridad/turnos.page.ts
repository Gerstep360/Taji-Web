import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { StaffApi } from '../../paquete1_usuarios_condominio/cu07_personal/staff.api';
import { StaffMember } from '../../paquete1_usuarios_condominio/cu07_personal/staff.models';
import { TurnoDetailComponent } from './turno-detail.component';
import { TurnoEditorComponent } from './turno-editor.component';
import { TurnosApi } from './turnos.api';
import { SecurityShift, ShiftPayload, ShiftStatus } from './turnos.models';
import { shiftCloseReasonRequired, shiftStartAllowedAt, shiftStartBlockReason, shiftTimingNotice } from './shift-timing';

export type ActiveTab = 'gestion' | 'miturno' | 'proximos' | 'historial';

@Component({
  selector: 'taji-turnos-page',
  imports: [
    FormsModule,
    DatePipe,
    IconComponent,
    TurnoEditorComponent,
    TurnoDetailComponent,
  ],
  templateUrl: './turnos.page.html',
  styleUrl: './turnos.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnosPage implements OnInit {
  private readonly turnosApi = inject(TurnosApi);
  private readonly staffApi = inject(StaffApi);
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly clock = signal(Date.now());
  private readonly serverOffset = signal(0);
  readonly serverNow = computed(() => this.clock() + this.serverOffset());
  readonly confirmError = signal('');

  constructor() {
    interval(1000).pipe(takeUntilDestroyed()).subscribe(() => this.clock.set(Date.now()));
  }

  private syncClock(shifts: SecurityShift[]): void {
    const serverTime = shifts.find((shift) => shift.timing)?.timing?.server_time;
    if (serverTime) {
      this.serverOffset.set(Date.parse(serverTime) - Date.now());
    }
    this.clock.set(Date.now());
  }

  canStart(shift: SecurityShift): boolean {
    return !this.startBlockReason(shift);
  }

  startBlockReason(shift: SecurityShift): string {
    return shiftStartBlockReason(shift, this.serverNow());
  }

  startAllowedAt(shift: SecurityShift): number {
    return shiftStartAllowedAt(shift);
  }

  timingNotice(shift: SecurityShift): string {
    return shiftTimingNotice(shift, this.serverNow());
  }

  closeReasonRequired(): boolean {
    const modal = this.confirmModal();
    return modal.type === 'cerrar' && !!modal.shift &&
      shiftCloseReasonRequired(modal.shift, this.serverNow());
  }

  // Permisos y Roles
  readonly isAdmin = computed(() => {
    const u = this.user();
    if (!u) return false;
    if (u.is_superuser) return true;
    const perms = u.role?.permissions ?? [];
    if (perms.includes('manage_security_shifts')) return true;
    const slug = (u.role?.slug ?? '').toLowerCase();
    return ['administrador', 'admin', 'directiva', 'directorio'].includes(slug);
  });

  readonly isSecurity = computed(() => {
    const u = this.user();
    if (!u) return false;
    const perms = u.role?.permissions ?? [];
    if (perms.includes('operate_security_shifts') || perms.includes('view_security_shifts')) return true;
    const slug = (u.role?.slug ?? '').toLowerCase();
    return ['seguridad', 'guardia', 'security'].includes(slug);
  });


  // Pestañas
  readonly activeTab = signal<ActiveTab>('gestion');

  // Estado de Datos
  readonly loading = signal<boolean>(false);
  readonly actionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  // Filtros de Gestión
  readonly filterGuard = signal<number | undefined>(undefined);
  readonly filterStatus = signal<string>('');
  readonly filterDateFrom = signal<string>('');
  readonly filterDateTo = signal<string>('');
  readonly searchQuery = signal<string>('');

  // Listados de datos
  readonly shiftsList = signal<SecurityShift[]>([]);
  readonly currentShift = signal<SecurityShift | null>(null);
  readonly currentShiftMessage = signal<string>('');
  readonly upcomingShifts = signal<SecurityShift[]>([]);
  readonly historyShifts = signal<SecurityShift[]>([]);
  readonly securityStaff = signal<StaffMember[]>([]);

  // Modales y Editores
  readonly showEditor = signal<boolean>(false);
  readonly editingShift = signal<SecurityShift | null>(null);
  readonly editorFormError = signal<string>('');
  readonly editorFieldErrors = signal<Record<string, string>>({});

  readonly showDetail = signal<boolean>(false);
  readonly selectedShift = signal<SecurityShift | null>(null);

  // Modal de Confirmación para Acciones (Iniciar, Cerrar, Cancelar)
  readonly confirmModal = signal<{
    open: boolean;
    type: 'iniciar' | 'cerrar' | 'cancelar';
    shift: SecurityShift | null;
    notes: string;
  }>({
    open: false,
    type: 'iniciar',
    shift: null,
    notes: '',
  });

  ngOnInit(): void {
    if (!this.isAdmin()) {
      this.activeTab.set('miturno');
    } else {
      this.loadSecurityStaff();
    }

    this.refreshCurrentTab();
  }

  setTab(tab: ActiveTab): void {
    if (!this.isAdmin() && tab === 'gestion') {
      tab = 'miturno';
    }
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.refreshCurrentTab();
  }

  refreshCurrentTab(): void {
    const tab = this.activeTab();
    if (tab === 'gestion') {
      if (this.isAdmin()) {
        this.loadManagementShifts();
      } else {
        this.activeTab.set('miturno');
        this.loadCurrentShift();
        this.loadUpcomingShifts();
      }
    } else if (tab === 'miturno') {
      this.loadCurrentShift();
      this.loadUpcomingShifts();
    } else if (tab === 'proximos') {
      this.loadUpcomingShifts();
    } else if (tab === 'historial') {
      this.loadHistoryShifts();
    }
  }


  loadManagementShifts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.turnosApi
      .list({
        guard: this.filterGuard(),
        status: this.filterStatus(),
        date_from: this.filterDateFrom(),
        date_to: this.filterDateTo(),
        search: this.searchQuery(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (Array.isArray(res)) {
            this.shiftsList.set(res);
          } else if (res && Array.isArray(res.results)) {
            this.shiftsList.set(res.results);
          } else {
            this.shiftsList.set([]);
          }
          this.syncClock(this.shiftsList());
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(this.extractErrorMsg(err, 'Error al cargar los turnos de seguridad.'));
        },
      });
  }

  loadCurrentShift(): void {
    this.loading.set(true);
    this.turnosApi.actual().subscribe({
      next: (res) => {
        this.loading.set(false);
        if ('id' in res && typeof res.id === 'number') {
          this.currentShift.set(res as SecurityShift);
          this.currentShiftMessage.set('');
        } else if ('shift' in res && res.shift) {
          this.currentShift.set(res.shift);
          this.currentShiftMessage.set('');
        } else {
          this.currentShift.set(null);
          const msg = 'message' in res && typeof res.message === 'string' ? res.message : 'No tienes un turno activo en este momento.';
          this.currentShiftMessage.set(msg);
        }
        this.syncClock(this.currentShift() ? [this.currentShift()!] : []);
      },
      error: (err) => {
        this.loading.set(false);
        this.currentShift.set(null);
        this.currentShiftMessage.set(this.extractErrorMsg(err, 'No se pudo obtener el turno actual.'));
      },
    });
  }


  loadUpcomingShifts(): void {
    this.turnosApi.proximos().subscribe({
      next: (res) => {
        this.upcomingShifts.set(res || []);
        this.syncClock(this.upcomingShifts());
      },
      error: (err) => {
        this.errorMessage.set(this.extractErrorMsg(err, 'Error al obtener los próximos turnos.'));
      },
    });
  }

  loadHistoryShifts(): void {
    this.loading.set(true);
    this.turnosApi
      .historial({
        guard: this.filterGuard(),
        status: this.filterStatus(),
        date_from: this.filterDateFrom(),
        date_to: this.filterDateTo(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.historyShifts.set(res || []);
          this.syncClock(this.historyShifts());
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(this.extractErrorMsg(err, 'Error al cargar el historial de turnos.'));
        },
      });
  }

  loadSecurityStaff(): void {
    if (!this.isAdmin()) {
      this.securityStaff.set([]);
      return;
    }
    this.staffApi
      .list({
        page: 1,
        page_size: 100,
        staff_type: 'SECURITY',
        status: 'ACTIVE',
      })
      .subscribe({
        next: (res) => {
          this.securityStaff.set(res.results || []);
        },
        error: () => {
          this.securityStaff.set([]);
        },
      });
  }


  // --- Operaciones de Edición y Creación ---
  openCreateModal(): void {
    this.editingShift.set(null);
    this.editorFormError.set('');
    this.editorFieldErrors.set({});
    this.showEditor.set(true);
  }

  openEditModal(shift: SecurityShift): void {
    if (shift.status !== 'SCHEDULED') {
      this.errorMessage.set('Solo se pueden modificar turnos en estado PROGRAMADO.');
      return;
    }
    this.editingShift.set(shift);
    this.editorFormError.set('');
    this.editorFieldErrors.set({});
    this.showEditor.set(true);
  }

  closeEditor(): void {
    this.showEditor.set(false);
    this.editingShift.set(null);
  }

  onSaveShift(payload: ShiftPayload): void {
    this.actionLoading.set(true);
    this.editorFormError.set('');
    this.editorFieldErrors.set({});

    const current = this.editingShift();
    if (current) {
      this.turnosApi.update(current.id, payload).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeEditor();
          this.showSuccess('Turno actualizado correctamente.');
          this.refreshCurrentTab();
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.handleEditorError(err);
        },
      });
    } else {
      this.turnosApi.create(payload).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeEditor();
          this.showSuccess('Turno programado correctamente.');
          this.refreshCurrentTab();
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.handleEditorError(err);
        },
      });
    }
  }

  // --- Operaciones de Detalle ---
  openDetail(shift: SecurityShift): void {
    this.selectedShift.set(shift);
    this.showDetail.set(true);
  }

  closeDetail(): void {
    this.showDetail.set(false);
    this.selectedShift.set(null);
  }

  // --- Operaciones de Iniciar, Cerrar y Cancelar ---
  openConfirm(type: 'iniciar' | 'cerrar' | 'cancelar', shift: SecurityShift): void {
    this.confirmError.set('');
    if (type === 'iniciar' && !this.canStart(shift)) {
      this.errorMessage.set(this.startBlockReason(shift));
      return;
    }
    this.confirmModal.set({
      open: true,
      type,
      shift,
      notes: '',
    });
  }

  closeConfirm(): void {
    this.confirmError.set('');
    this.confirmModal.set({
      open: false,
      type: 'iniciar',
      shift: null,
      notes: '',
    });
  }

  executeConfirmAction(): void {
    const modal = this.confirmModal();
    if (!modal.shift) return;

    const { type, shift } = modal;
    const notes = modal.notes.trim();
    this.confirmError.set('');
    if (type === 'iniciar' && !this.canStart(shift)) {
      this.confirmError.set(this.startBlockReason(shift));
      return;
    }
    if (this.closeReasonRequired() && !notes) {
      this.confirmError.set('Indica el motivo del cierre anticipado o posterior al horario.');
      return;
    }
    this.actionLoading.set(true);

    if (type === 'iniciar') {
      this.turnosApi.iniciar(shift.id, notes).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeConfirm();
          this.showSuccess('Turno iniciado correctamente.');
          this.refreshCurrentTab();
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.confirmError.set(this.extractActionError(err, 'No se pudo iniciar el turno.'));
        },
      });
    } else if (type === 'cerrar') {
      this.turnosApi.cerrar(shift.id, notes).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeConfirm();
          this.showSuccess('Turno cerrado correctamente.');
          this.refreshCurrentTab();
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.confirmError.set(this.extractActionError(err, 'No se pudo cerrar el turno.'));
        },
      });
    } else if (type === 'cancelar') {
      this.turnosApi.cancelar(shift.id, notes).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeConfirm();
          this.showSuccess('Turno cancelado correctamente.');
          this.refreshCurrentTab();
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.confirmError.set(this.extractActionError(err, 'No se pudo cancelar el turno.'));
        },
      });
    }
  }

  // --- Auxiliares ---
  statusLabel(status: ShiftStatus | string): string {
    switch (status) {
      case 'SCHEDULED': return 'PROGRAMADO';
      case 'OPEN': return 'EN CURSO';
      case 'CLOSED': return 'FINALIZADO';
      case 'CANCELLED': return 'CANCELADO';
      default: return status;
    }
  }

  statusBadgeClass(status: ShiftStatus | string): string {
    switch (status) {
      case 'SCHEDULED': return 'badge-scheduled';
      case 'OPEN': return 'badge-open';
      case 'CLOSED': return 'badge-closed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return '';
    }
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 4000);
  }

  private handleEditorError(err: any): void {
    if (err?.error?.error?.fields) {
      this.editorFieldErrors.set(err.error.error.fields);
    }
    const msg = this.extractErrorMsg(err, 'No se pudo guardar la información del turno.');
    this.editorFormError.set(msg);
  }

  private extractErrorMsg(err: any, fallback: string): string {
    if (err?.error?.error?.message) return err.error.error.message;
    if (err?.error?.detail) return err.error.detail;
    if (typeof err?.error === 'string') return err.error;
    return fallback;
  }

  private extractActionError(err: any, fallback: string): string {
    const notesError = err?.error?.error?.fields?.notes;
    if (Array.isArray(notesError)) return notesError.join(' ');
    return this.extractErrorMsg(err, fallback);
  }
}
