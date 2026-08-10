import { DecimalValue, EntityId, IsoDateTime, JsonMap } from './shared.models';
import { StaffType } from './condominium.models';

export type IncidentStatus = 'REPORTED' | 'REVIEWED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type AttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type CommentVisibility = 'PUBLIC' | 'INTERNAL';
export type AIReviewStatus = 'PENDING' | 'ACCEPTED' | 'CORRECTED' | 'REJECTED';

export interface IncidentCategory {
  id: EntityId; code: string; name: string; description: string;
  default_staff_type: StaffType | null; is_active: boolean;
}
export interface PriorityLevel {
  id: EntityId; code: string; name: string; rank: number;
  min_score: DecimalValue | null; max_score: DecimalValue | null;
  target_minutes: number | null; is_active: boolean;
}
export interface Incident {
  id: EntityId; public_code: string; reporter_user_id: EntityId | null;
  reporter_resident_id: EntityId | null; sector_id: EntityId | null; unit_id: EntityId | null;
  asset_id: EntityId | null; category_id: EntityId | null; priority_id: EntityId | null;
  current_assignee_staff_id: EntityId | null; title: string; description: string;
  status: IncidentStatus; due_at: IsoDateTime | null; resolved_at: IsoDateTime | null;
  closed_at: IsoDateTime | null; created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface IncidentAttachment {
  id: EntityId; incident_id: EntityId; uploaded_by_user_id: EntityId | null;
  file_path: string; file_type: AttachmentType; caption: string; created_at: IsoDateTime;
}
export interface IncidentAssignment {
  id: EntityId; incident_id: EntityId; assigned_to_staff_id: EntityId;
  assigned_by_user_id: EntityId | null; assigned_at: IsoDateTime;
  ended_at: IsoDateTime | null; reason: string;
}
export interface IncidentStatusHistory {
  id: EntityId; incident_id: EntityId; changed_by_user_id: EntityId | null;
  from_status: IncidentStatus | null; to_status: IncidentStatus; comment: string;
  changed_at: IsoDateTime;
}
export interface IncidentComment {
  id: EntityId; incident_id: EntityId; author_user_id: EntityId | null;
  body: string; visibility: CommentVisibility; created_at: IsoDateTime;
}
export interface RiskRule {
  id: EntityId; code: string; name: string; entity_type: string; conditions: JsonMap;
  weight: DecimalValue; description: string; is_active: boolean;
  created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface IncidentAIAnalysis {
  id: EntityId; incident_id: EntityId; model_name: string; model_version: string;
  text_hash: string; suggested_category_id: EntityId | null;
  suggested_priority_id: EntityId | null; risk_score: DecimalValue | null;
  confidence: DecimalValue | null; suggested_staff_type: StaffType | null;
  suggested_action: string; raw_output: JsonMap; reviewed_by_user_id: EntityId | null;
  review_status: AIReviewStatus; reviewed_at: IsoDateTime | null; created_at: IsoDateTime;
}
export interface IncidentAIEntity {
  id: EntityId; analysis_id: EntityId; entity_type: string; text_value: string;
  normalized_value: string; confidence: DecimalValue | null; applied_weight: DecimalValue;
  risk_rule_id: EntityId | null;
}