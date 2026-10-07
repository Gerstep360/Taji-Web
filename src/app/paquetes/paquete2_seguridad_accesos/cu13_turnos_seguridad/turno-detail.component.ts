import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SecurityShift } from './turnos.models';

@Component({
  selector: 'taji-turno-detail',
  imports: [DatePipe],
  templateUrl: './turno-detail.component.html',
  styleUrl: './turno-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnoDetailComponent {
  readonly shift = input.required<SecurityShift>();
  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'PROGRAMADO';
      case 'OPEN': return 'EN CURSO';
      case 'CLOSED': return 'FINALIZADO';
      case 'CANCELLED': return 'CANCELADO';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'badge-scheduled';
      case 'OPEN': return 'badge-open';
      case 'CLOSED': return 'badge-closed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return '';
    }
  }
}
