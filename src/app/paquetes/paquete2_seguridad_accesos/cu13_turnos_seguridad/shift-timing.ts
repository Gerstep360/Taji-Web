import { SecurityShift } from './turnos.models';

// La API proporciona la tolerancia; el valor alternativo mantiene compatibilidad
// con respuestas anteriores mientras se actualiza el backend.
export function shiftStartAllowedAt(shift: SecurityShift): number {
  return shift.timing
    ? Date.parse(shift.timing.start_allowed_at)
    : Date.parse(shift.scheduled_start) - 15 * 60_000;
}

export function shiftStartBlockReason(shift: SecurityShift, now: number): string {
  if (shift.status !== 'SCHEDULED') return 'Solo se puede iniciar un turno programado.';
  if (now >= Date.parse(shift.scheduled_end)) return 'Horario finalizado: turno sin iniciar.';
  if (now < shiftStartAllowedAt(shift)) return 'El inicio se habilita 15 minutos antes del horario programado.';
  if (shift.timing?.other_open_shift_id) return 'Debes cerrar tu otro turno abierto antes de iniciar este.';
  return '';
}

export function shiftTimingNotice(shift: SecurityShift, now: number): string {
  const end = Date.parse(shift.scheduled_end);
  if (shift.status === 'SCHEDULED' && now >= end) return 'Sin iniciar: el horario de este turno ya finalizó.';
  if (shift.status === 'OPEN' && now >= end) return 'Horario finalizado, cierre pendiente.';
  if (shift.status === 'CLOSED' && shift.closed_at) {
    const closedAt = Date.parse(shift.closed_at);
    if (closedAt < end) return 'Cierre anticipado';
    if (closedAt > end) return 'Cierre posterior al horario';
  }
  return '';
}

export function shiftCloseReasonRequired(shift: SecurityShift, now: number): boolean {
  return shift.status === 'OPEN' && now !== Date.parse(shift.scheduled_end);
}
