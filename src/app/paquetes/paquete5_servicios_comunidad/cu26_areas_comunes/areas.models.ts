// Contratos alineados con el backend Django (app `community`, CU26):
//   GET/POST/PATCH  /api/v1/community/areas/          { id, name, description, sector, sector_name, capacity, requires_approval, status }
//   GET/POST/PATCH  /api/v1/community/area-schedules/ { id, common_area, weekday, opens_at, closes_at, is_active }
//   GET/POST/DELETE /api/v1/community/area-blocks/    { id, common_area, work_order, blocked_from, blocked_until, reason, created_by_user, created_at }
//   GET              /api/v1/community/reservations/  { id, common_area, common_area_name, resident, resident_name, start_at, end_at, status, purpose, created_at }

/** Elecciones exactas del modelo `CommonArea.Status` en Django. */
export type AreaStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE' | 'INACTIVE';

export const AREA_STATUS_LABELS: Record<AreaStatus, string> = {
  AVAILABLE: 'Disponible',
  UNAVAILABLE: 'No disponible',
  MAINTENANCE: 'Mantenimiento',
  INACTIVE: 'Inactiva',
};

export interface CommonArea {
  id: number;
  name: string;
  description: string;
  sector: number | null;
  sector_name?: string;
  /** El modelo exige capacity > 0 (chk_common_area_capacity) o null. */
  capacity: number | null;
  requires_approval: boolean;
  status: AreaStatus;
}

export interface AreaSchedule {
  id: number;
  common_area: number;
  /** 0 = lunes … 6 = domingo (convención `date.weekday()` de Django). */
  weekday: number;
  /** "HH:MM:SS" (DRF TimeField). */
  opens_at: string;
  closes_at: string;
  is_active: boolean;
}

export interface AreaBlock {
  id: number;
  common_area: number;
  work_order: number | null;
  /** ISO 8601 con zona, por ejemplo "2026-11-20T08:00:00-04:00". */
  blocked_from: string;
  blocked_until: string;
  /** max_length=240 en el modelo. */
  reason: string;
  created_by_user: number | null;
  created_at: string;
}

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface Reservation {
  id: number;
  common_area: number;
  common_area_name: string;
  resident: number | null;
  resident_name: string;
  start_at: string;
  end_at: string;
  status: ReservationStatus;
  purpose: string;
  created_at: string;
}

export type CommonAreaPayload = Omit<CommonArea, 'id' | 'sector_name'>;
export type AreaSchedulePayload = Omit<AreaSchedule, 'id'>;
export type AreaBlockPayload = Pick<AreaBlock, 'common_area' | 'blocked_from' | 'blocked_until' | 'reason'> & {
  work_order?: number | null;
};

/**
 * Respuesta paginada de Taji: `{ pagination: {...}, results: [...] }`.
 * Se tolera también una lista plana o el `{count, results}` estándar de DRF.
 */
export type ListResponse<T> = T[] | { results?: T[] } | null;
