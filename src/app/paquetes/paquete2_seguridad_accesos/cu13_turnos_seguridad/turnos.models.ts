export type ShiftStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface CatalogOption {
  value: string;
  label: string;
}

export interface SecurityShiftOptions {
  statuses: CatalogOption[];
}

export interface ShiftTiming {
  server_time: string;
  start_allowed_at: string;
  can_start: boolean;
  start_block_reason: string;
  other_open_shift_id: number | null;
  is_overdue: boolean;
  is_missed: boolean;
  closing_timing: 'EARLY' | 'ON_TIME' | 'LATE';
  close_reason_required: boolean;
}

export interface SecurityShift {
  id: number;
  condominium: number | null;
  condominium_name: string;
  guard_staff: number;
  guard_name: string;
  guard_employee_code: string;
  scheduled_start: string;
  scheduled_end: string;
  opened_at: string | null;
  closed_at: string | null;
  status: ShiftStatus;
  opening_notes: string;
  closing_notes: string;
  observation: string;
  created_by_user: number | null;
  created_at: string;
  updated_at: string;
  timing?: ShiftTiming;
}

export interface ShiftPayload {
  guard_staff: number;
  scheduled_start: string;
  scheduled_end: string;
  observation?: string;
  condominium?: number | null;
  fecha?: string;
  hora_inicio_planificada?: string;
  hora_fin_planificada?: string;
}

export interface ShiftActionPayload {
  notes?: string;
}

export interface ShiftQuery {
  page?: number;
  page_size?: number;
  guard?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  ordering?: string;
}

export interface ShiftListResponse {
  pagination?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: SecurityShift[];
}

export interface CurrentShiftResponse {
  shift?: SecurityShift | null;
  message?: string;
  id?: number;
  guard_staff?: number;
  guard_name?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  opened_at?: string | null;
  closed_at?: string | null;
  status?: ShiftStatus;
  opening_notes?: string;
  closing_notes?: string;
  observation?: string;
}
