import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs/operators';

import { apiErrorMessage } from '../../../core/api-error';
import { IconComponent } from '../../../shared/ui/icon.component';
import { VisitantesApi } from './visitantes.api';
import { VisitAuthorization, VisitStatus } from './visitantes.models';

@Component({
  selector: 'taji-visit-detail',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './visit-detail.component.html',
  styleUrls: ['./visit-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitDetailComponent {
  private readonly api = inject(VisitantesApi);

  @Input({ required: true }) visit!: VisitAuthorization;
  @Input() canManage = false;

  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<VisitAuthorization>();
  @Output() cancelled = new EventEmitter<VisitAuthorization>();

  readonly copied = signal(false);
  readonly cancelling = signal(false);
  readonly actionError = signal('');

  get canCancel(): boolean {
    return (
      (this.visit.status === 'AUTHORIZED' || this.visit.status === 'ACTIVE') &&
      !this.visit.cancelled_at
    );
  }

  get canEdit(): boolean {
    return this.visit.status === 'AUTHORIZED';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  getStatusIcon(status: VisitStatus): string {
    switch (status) {
      case 'AUTHORIZED':
        return 'check-circle';
      case 'ACTIVE':
        return 'user-check';
      case 'FINISHED':
        return 'check';
      case 'CANCELLED':
        return 'ban';
      case 'EXPIRED':
        return 'clock';
      default:
        return 'clock';
    }
  }

  getStatusDescription(status: VisitStatus): string {
    switch (status) {
      case 'AUTHORIZED':
        return 'Visita programada y autorizada para ingresar en su periodo de vigencia.';
      case 'ACTIVE':
        return 'El visitante se encuentra actualmente dentro de las instalaciones del condominio.';
      case 'FINISHED':
        return 'La visita concluyó y el visitante ha registrado su salida del condominio.';
      case 'CANCELLED':
        return 'La autorización fue revocada o cancelada previamente.';
      case 'EXPIRED':
        return 'El periodo de vigencia de esta autorización venció sin ser utilizada.';
      default:
        return '';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('es-BO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return dateString;
    }
  }

  copyQrCode(): void {
    if (!this.visit.qr_uuid) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.visit.qr_uuid).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      });
    }
  }

  onCancel(): void {
    if (!confirm('¿Estás seguro de que deseas cancelar esta autorización de visita?')) {
      return;
    }

    this.cancelling.set(true);
    this.actionError.set('');

    this.api
      .cancel(this.visit.id)
      .pipe(finalize(() => this.cancelling.set(false)))
      .subscribe({
        next: (updated) => {
          this.cancelled.emit(updated);
        },
        error: (err) => {
          this.actionError.set(
            apiErrorMessage(err, 'No fue posible cancelar la autorización.'),
          );
        },
      });
  }
}
