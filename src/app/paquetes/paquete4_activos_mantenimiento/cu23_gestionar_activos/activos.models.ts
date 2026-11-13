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
  sector_id: number;
  sector_name: string;
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

export interface AssetQrCode {
  asset_id: number;
  payload: string;
  image_base64: string;
  image_media_type: string;
}

export interface AssetHistoryIncident {
  id: number;
  public_code: string;
  title: string;
  status: string;
  created_at: string;
}

export interface AssetHistoryWorkOrder {
  id: number;
  public_code: string;
  title: string;
  work_type: string;
  status: string;
  scheduled_for: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AssetHistoryMaintenancePlan {
  id: number;
  name: string;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  is_active: boolean;
}

export interface AssetHistory {
  asset_id: number;
  incidents: AssetHistoryIncident[];
  work_orders: AssetHistoryWorkOrder[];
  maintenance_plans: AssetHistoryMaintenancePlan[];
}

export interface AssetsPage<T> {
  results: T[];
  pagination?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
}

export interface AssetFilters {
  page?: number;
  search?: string;
  status?: AssetStatus | '';
  asset_type?: number | '';
  sector?: number | '';
}

export interface SectorOption {
  id: number;
  code: string;
  name: string;
}
