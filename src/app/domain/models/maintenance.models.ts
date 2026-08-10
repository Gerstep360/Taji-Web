import { DecimalValue, EntityId, IsoDate, IsoDateTime, JsonMap } from './shared.models';
import { AttachmentType } from './incidents.models';

export type AssetStatus = 'ACTIVE' | 'OUT_OF_SERVICE' | 'MAINTENANCE' | 'RETIRED';
export type SupplierStatus = 'ACTIVE' | 'INACTIVE';
export type WorkType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
export type WorkOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface AssetType {
  id: EntityId; code: string; name: string; description: string; is_active: boolean;
}
export interface Asset {
  id: EntityId; asset_type_id: EntityId; sector_id: EntityId | null; code: string;
  name: string; description: string; brand: string; model: string; serial_number: string;
  installation_date: IsoDate | null; status: AssetStatus; qr_uuid: string;
  extra_data: JsonMap; created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface Supplier {
  id: EntityId; name: string; contact_name: string; phone: string; email: string;
  specialty: string; status: SupplierStatus; notes: string;
}
export interface MaintenancePlan {
  id: EntityId; asset_id: EntityId; name: string; description: string;
  frequency_days: number; last_completed_at: IsoDateTime | null; next_due_at: IsoDateTime;
  is_active: boolean; created_at: IsoDateTime;
}
export interface WorkOrder {
  id: EntityId; public_code: string; incident_id: EntityId | null; asset_id: EntityId | null;
  maintenance_plan_id: EntityId | null; supplier_id: EntityId | null;
  created_by_user_id: EntityId | null; current_assignee_staff_id: EntityId | null;
  work_type: WorkType; priority_id: EntityId | null; title: string; description: string;
  status: WorkOrderStatus; scheduled_for: IsoDateTime | null; started_at: IsoDateTime | null;
  completed_at: IsoDateTime | null; estimated_cost: DecimalValue | null;
  actual_cost: DecimalValue | null; created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface WorkOrderAssignment {
  id: EntityId; work_order_id: EntityId; assigned_to_staff_id: EntityId;
  assigned_by_user_id: EntityId | null; assigned_at: IsoDateTime;
  ended_at: IsoDateTime | null; reason: string;
}
export interface WorkOrderAttachment {
  id: EntityId; work_order_id: EntityId; uploaded_by_user_id: EntityId | null;
  file_path: string; file_type: AttachmentType; caption: string; created_at: IsoDateTime;
}
export interface WorkOrderCostItem {
  id: EntityId; work_order_id: EntityId; description: string;
  quantity: DecimalValue; unit_cost: DecimalValue; created_at: IsoDateTime;
}