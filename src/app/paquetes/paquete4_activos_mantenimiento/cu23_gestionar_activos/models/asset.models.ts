export type AssetStatus = 'ACTIVE' | 'OUT_OF_SERVICE' | 'MAINTENANCE' | 'RETIRED';

export interface AssetType {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface Asset {
  id: number;
  code: string;
  name: string;
  description: string;
  asset_type_id: number;
  asset_type_name: string;
  sector_id: number | null;
  sector_name: string | null;
  brand: string;
  model: string;
  serial_number: string;
  installation_date: string | null;
  status: AssetStatus;
  qr_uuid: string;
  extra_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssetCreateRequest {
  code: string;
  name: string;
  description?: string;
  asset_type_id: number;
  sector_id?: number | null;
  brand?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string | null;
  extra_data?: Record<string, unknown>;
}

export interface AssetUpdateRequest extends Partial<AssetCreateRequest> {
  status?: AssetStatus;
}

export interface AssetQRResponse {
  asset_id: number;
  payload: string;
  image_base64: string;
  image_media_type: string;
}

export interface AssetIncident {
  id: number;
  public_code: string;
  title: string;
  status: string;
  created_at: string;
}

export interface AssetWorkOrder {
  id: number;
  public_code: string;
  title: string;
  work_type: string;
  status: string;
  scheduled_for: string;
  completed_at: string | null;
  created_at: string;
}

export interface AssetMaintenancePlan {
  id: number;
  name: string;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  is_active: boolean;
}

export interface AssetHistory {
  asset_id: number;
  incidents: AssetIncident[];
  work_orders: AssetWorkOrder[];
  maintenance_plans: AssetMaintenancePlan[];
}

export interface Sector {
  id: number;
  name: string;
  condominium_id: number;
  is_active: boolean;
}
