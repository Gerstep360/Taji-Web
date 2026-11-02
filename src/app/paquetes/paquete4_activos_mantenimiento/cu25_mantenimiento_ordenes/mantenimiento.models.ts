export type WorkType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
export type WorkOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface MaintenanceAssetOption {
  id: number;
  code: string;
  name: string;
  status: string;
  sector_name: string;
  asset_type_name: string;
}

export interface MaintenanceStaffOption {
  id: number;
  employee_code: string | null;
  staff_type: string;
  full_name: string;
}

export interface MaintenancePriorityOption {
  id: number;
  code: string;
  name: string;
  rank: number;
}

export interface MaintenanceSupplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  specialty: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes: string;
}

export interface MaintenancePlan {
  id: number;
  asset_id: number;
  asset_code: string;
  asset_name: string;
  name: string;
  description: string;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkOrderAssignment {
  id: number;
  assigned_to_staff: number;
  assigned_to_name: string;
  assigned_to_code: string;
  assigned_by_user: number | null;
  assigned_at: string;
  ended_at: string | null;
  reason: string;
}

export interface WorkOrderAttachment {
  id: number;
  file_type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  caption: string;
  created_at: string;
  download_url: string;
}

export interface WorkOrderCostItem {
  id: number;
  description: string;
  quantity: string;
  unit_cost: string;
  total: string;
  created_at: string;
}

export interface WorkOrderStatusHistory {
  id: number;
  from_status: string | null;
  to_status: WorkOrderStatus;
  notes: string;
  changed_at: string;
  changed_by_name: string;
}

export interface MaintenanceWorkOrder {
  id: number;
  public_code: string;
  incident_id: number | null;
  incident_code: string;
  asset_id: number | null;
  asset_code: string;
  asset_name: string;
  maintenance_plan_id: number | null;
  maintenance_plan_name: string;
  supplier_id: number | null;
  supplier_name: string;
  created_by_user: number | null;
  current_assignee_staff_id: number | null;
  assignee_name: string;
  work_type: WorkType;
  priority_id: number | null;
  priority_name: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_cost: string | null;
  actual_cost: string | null;
  created_at: string;
  updated_at: string;
  assignments: WorkOrderAssignment[];
  attachments: WorkOrderAttachment[];
  cost_items: WorkOrderCostItem[];
  status_history: WorkOrderStatusHistory[];
}

export interface MaintenancePage<T> {
  results: T[];
  pagination?: {
    page: number;
    total_pages: number;
    total_items: number;
    next: string | null;
    previous: string | null;
  };
}

export interface WorkOrderFilters {
  status?: string;
  work_type?: string;
  asset?: string;
  assignee?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
}
