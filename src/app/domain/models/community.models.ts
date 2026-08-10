import { DecimalValue, EntityId, IsoDateTime } from './shared.models';

export type CommonAreaStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE' | 'INACTIVE';
export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type AssemblyStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type AgreementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export interface CommonArea {
  id: EntityId; sector_id: EntityId | null; name: string; description: string;
  capacity: number | null; requires_approval: boolean; status: CommonAreaStatus;
  created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface CommonAreaSchedule {
  id: EntityId; common_area_id: EntityId; weekday: number; opens_at: string;
  closes_at: string; is_active: boolean;
}
export interface CommonAreaBlock {
  id: EntityId; common_area_id: EntityId; work_order_id: EntityId | null;
  blocked_from: IsoDateTime; blocked_until: IsoDateTime; reason: string;
  created_by_user_id: EntityId | null; created_at: IsoDateTime;
}
export interface Reservation {
  id: EntityId; common_area_id: EntityId; resident_id: EntityId;
  created_by_user_id: EntityId | null; start_at: IsoDateTime; end_at: IsoDateTime;
  status: ReservationStatus; purpose: string; approved_by_user_id: EntityId | null;
  approved_at: IsoDateTime | null; cancelled_at: IsoDateTime | null; created_at: IsoDateTime;
}
export interface Assembly {
  id: EntityId; created_by_user_id: EntityId | null; title: string; description: string;
  scheduled_at: IsoDateTime; location: string; status: AssemblyStatus; minutes_text: string;
  created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface Agreement {
  id: EntityId; assembly_id: EntityId; title: string; description: string;
  responsible_user_id: EntityId | null; due_at: IsoDateTime | null;
  estimated_budget: DecimalValue | null; actual_cost: DecimalValue | null;
  status: AgreementStatus; completed_at: IsoDateTime | null;
  created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface AgreementAttachment {
  id: EntityId; agreement_id: EntityId; uploaded_by_user_id: EntityId | null;
  file_path: string; description: string; created_at: IsoDateTime;
}