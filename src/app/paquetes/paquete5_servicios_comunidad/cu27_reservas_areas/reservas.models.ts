export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type AreaStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE' | 'INACTIVE';

export interface Page<T> {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: T[];
}

export interface AreaSchedule {
  weekday: number;
  opens_at: string;
  closes_at: string;
}

export interface ReservableArea {
  id: number;
  name: string;
  description: string;
  sector: number | null;
  sector_name: string;
  capacity: number | null;
  requires_approval: boolean;
  status: AreaStatus;
  status_label: string;
  bookable: boolean;
  schedules: AreaSchedule[];
  upcoming_block: { start: string; end: string; reason: string } | null;
}

export interface ReservationActions {
  approve: boolean;
  reject: boolean;
  cancel: boolean;
  complete: boolean;
}

export interface Reservation {
  id: number;
  common_area: number;
  common_area_name: string;
  resident: number;
  resident_name: string;
  resident_unit: string;
  start_at: string;
  end_at: string;
  status: ReservationStatus;
  status_label: string;
  purpose: string;
  approved_at: string | null;
  decided_by_name: string;
  rejection_reason: string;
  cancelled_at: string | null;
  cancelled_by_name: string;
  cancellation_reason: string;
  completed_at: string | null;
  created_at: string;
  created_by_name: string;
  is_mine: boolean;
  permissions: ReservationActions;
}

export interface AreaBlock {
  id: number;
  common_area: number;
  common_area_name: string;
  blocked_from: string;
  blocked_until: string;
  reason: string;
}

export interface CalendarResponse {
  date_from: string;
  date_to: string;
  reservations: Reservation[];
  blocks: AreaBlock[];
}

export interface ReservationSummary {
  pending: number;
  today: number;
  in_progress: number;
  next_7_days: number;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface OccupiedRange extends TimeRange {
  kind: 'RESERVATION' | 'BLOCK';
  id: number | null;
  status: ReservationStatus | 'BLOCKED';
  mine: boolean;
  label: string;
}

export interface AreaAvailability {
  date: string;
  area: { id: number; name: string; status: AreaStatus; requires_approval: boolean; capacity: number | null };
  has_schedule: boolean;
  is_open: boolean;
  bookable: boolean;
  reason: string;
  min_duration_minutes: number;
  max_duration_minutes: number;
  windows: TimeRange[];
  occupied: OccupiedRange[];
  free: TimeRange[];
}

export interface ResidentOption {
  id: number;
  full_name: string;
  unit: string;
}

export interface ReservationFilters {
  status?: string;
  common_area?: number | string;
  search?: string;
  date_from?: string;
  date_to?: string;
  when?: 'upcoming' | 'past' | '';
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CreateReservationPayload {
  common_area: number;
  resident?: number | null;
  start_at: string;
  end_at: string;
  purpose: string;
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Finalizada',
};

export const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
