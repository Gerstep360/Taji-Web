import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../../shared/ui/icon.component';
import { SeguimientoIncidenciasApi } from './seguimiento-incidencias.api';
import { IncidentDetailModel } from './seguimiento-incidencias.models';

@Component({
  selector: 'taji-incident-detail',
  imports: [FormsModule, DatePipe, IconComponent],
  templateUrl: './incident-detail.component.html',
  styleUrl: './incident-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentDetailComponent implements OnInit {
  private readonly api = inject(SeguimientoIncidenciasApi);

  @Input({ required: true }) incidentId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');
  readonly incident = signal<IncidentDetailModel | null>(null);

  readonly activeTab = signal<'historial' | 'evidencias' | 'comentarios' | 'asignaciones'>('historial');

  // Forms
  readonly newCommentBody = signal<string>('');
  readonly newCommentVisibility = signal<'PUBLIC' | 'INTERNAL'>('PUBLIC');
  readonly commentSubmitting = signal<boolean>(false);

  readonly newStatus = signal<string>('');
  readonly statusComment = signal<string>('');
  readonly statusSubmitting = signal<boolean>(false);

  readonly newAssigneeId = signal<number | null>(null);
  readonly assignReason = signal<string>('');
  readonly assignSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    this.loadDetail();
  }

  loadDetail(): void {
    if (!this.incidentId) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.detail(this.incidentId).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.incident.set(res);
        this.newStatus.set(res.status);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'No se pudo cargar el detalle de la incidencia.');
      },
    });
  }

  setTab(tab: 'historial' | 'evidencias' | 'comentarios' | 'asignaciones'): void {
    this.activeTab.set(tab);
  }

  submitComment(event: Event): void {
    event.preventDefault();
    const body = this.newCommentBody().trim();
    if (!body) return;

    this.commentSubmitting.set(true);
    this.api.addComment(this.incidentId, body, this.newCommentVisibility()).subscribe({
      next: () => {
        this.commentSubmitting.set(false);
        this.newCommentBody.set('');
        this.showSuccess('Comentario agregado correctamente.');
        this.loadDetail();
        this.updated.emit();
      },
      error: (err) => {
        this.commentSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'No se pudo agregar el comentario.');
      },
    });
  }

  submitStatusChange(event: Event): void {
    event.preventDefault();
    const status = this.newStatus();
    if (!status) return;

    this.statusSubmitting.set(true);
    this.api.updateStatus(this.incidentId, status, this.statusComment()).subscribe({
      next: () => {
        this.statusSubmitting.set(false);
        this.statusComment.set('');
        this.showSuccess('Estado actualizado correctamente.');
        this.loadDetail();
        this.updated.emit();
      },
      error: (err) => {
        this.statusSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'No se pudo actualizar el estado.');
      },
    });
  }

  submitAssignment(event: Event): void {
    event.preventDefault();
    const staffId = this.newAssigneeId();
    const reason = this.assignReason().trim();
    if (!staffId || !reason) return;

    this.assignSubmitting.set(true);
    this.api.assignStaff(this.incidentId, staffId, reason).subscribe({
      next: () => {
        this.assignSubmitting.set(false);
        this.assignReason.set('');
        this.newAssigneeId.set(null);
        this.showSuccess('Asignación realizada correctamente.');
        this.loadDetail();
        this.updated.emit();
      },
      error: (err) => {
        this.assignSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'No se pudo asignar al personal.');
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REPORTED': return 'Reportada';
      case 'REVIEWED': return 'Revisada';
      case 'ASSIGNED': return 'Asignada';
      case 'IN_PROGRESS': return 'En Proceso';
      case 'RESOLVED': return 'Resuelta';
      case 'CLOSED': return 'Cerrada';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'REPORTED': return 'badge-reported';
      case 'REVIEWED': return 'badge-reviewed';
      case 'ASSIGNED': return 'badge-assigned';
      case 'IN_PROGRESS': return 'badge-progress';
      case 'RESOLVED': return 'badge-resolved';
      case 'CLOSED': return 'badge-closed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return '';
    }
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 4000);
  }
}
