import { DecimalValue, EntityId, IsoDateTime } from './shared.models';

export type VisitStatus = 'AUTHORIZED' | 'ACTIVE' | 'FINISHED' | 'CANCELLED' | 'EXPIRED';
export type AccessEventType = 'ENTRY' | 'EXIT' | 'DENIED';
export type ValidationMethod = 'QR' | 'FACE' | 'MANUAL';
export type ValidationResult = 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
export type ShiftStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type ShiftLogType = 'NOTE' | 'INCIDENT' | 'ALERT' | 'HANDOVER_NOTE';
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type HandoverStatus = 'PENDING' | 'RECEIVED' | 'REJECTED';
export type FaceResult = 'MATCH' | 'NO_MATCH' | 'REVIEW';

export interface VisitAuthorization {
  id: EntityId; visitor_person_id: EntityId; authorized_by_resident_id: EntityId;
  unit_id: EntityId; created_by_user_id: EntityId | null; purpose: string;
  valid_from: IsoDateTime; valid_until: IsoDateTime; status: VisitStatus; qr_uuid: string;
  qr_expires_at: IsoDateTime; cancelled_at: IsoDateTime | null; notes: string; created_at: IsoDateTime;
}
export interface AccessEvent {
  id: EntityId; authorization_id: EntityId | null; person_id: EntityId | null;
  guard_staff_id: EntityId | null; event_type: AccessEventType;
  validation_method: ValidationMethod; validation_result: ValidationResult;
  occurred_at: IsoDateTime; notes: string;
}
export interface SecurityShift {
  id: EntityId; guard_staff_id: EntityId; scheduled_start: IsoDateTime;
  scheduled_end: IsoDateTime; opened_at: IsoDateTime | null; closed_at: IsoDateTime | null;
  status: ShiftStatus; opening_notes: string; closing_notes: string; created_at: IsoDateTime;
}
export interface ShiftLogEntry {
  id: EntityId; shift_id: EntityId; created_by_user_id: EntityId | null;
  sector_id: EntityId | null; entry_type: ShiftLogType; severity: Severity;
  title: string; description: string; occurred_at: IsoDateTime; created_at: IsoDateTime;
}
export interface ShiftHandover {
  id: EntityId; outgoing_shift_id: EntityId; incoming_shift_id: EntityId | null;
  delivered_by_user_id: EntityId | null; received_by_user_id: EntityId | null;
  summary: string; delivered_at: IsoDateTime; received_at: IsoDateTime | null; status: HandoverStatus;
}
export interface BiometricReference {
  id: EntityId; resident_id: EntityId; reference_image: string; embedding: string;
  embedding_dim: number; model_name: string; model_version: string; is_active: boolean;
  enrolled_by_user_id: EntityId | null; enrolled_at: IsoDateTime;
}
export interface FaceVerification {
  id: EntityId; captured_image: string; matched_resident_id: EntityId | null;
  biometric_reference_id: EntityId | null; guard_staff_id: EntityId | null;
  access_event_id: EntityId | null; similarity_score: DecimalValue | null;
  threshold: DecimalValue | null; model_name: string; model_version: string;
  result: FaceResult; human_confirmed: boolean | null;
  confirmed_by_user_id: EntityId | null; verified_at: IsoDateTime;
}