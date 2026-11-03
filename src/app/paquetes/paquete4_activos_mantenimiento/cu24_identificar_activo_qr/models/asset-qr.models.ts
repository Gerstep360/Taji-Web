import { IsoDate, IsoDateTime } from '../../../../domain/models/shared.models';

export interface AssetQRScanRequest {
  qr_payload: string;
}

export interface AssetQRScanResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  asset_type_name: string;
  sector_name: string;
  brand: string;
  model: string;
  serial_number: string;
  status: 'ACTIVE' | 'OUT_OF_SERVICE' | 'MAINTENANCE' | 'RETIRED';
  qr_uuid: string;
  created_at: IsoDateTime;
}

export interface AssetIncident {
  id: number;
  public_code: string;
  title: string;
  status: string;
  created_at: IsoDateTime;
}

export interface AssetWorkOrder {
  id: number;
  public_code: string;
  title: string;
  work_type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  status: string;
  scheduled_for: IsoDateTime | null;
  completed_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export interface AssetMaintenancePlan {
  id: number;
  name: string;
  frequency_days: number;
  last_completed_at: IsoDateTime | null;
  next_due_at: IsoDateTime;
  is_active: boolean;
}

export interface AssetHistory {
  asset_id: number;
  incidents: AssetIncident[];
  work_orders: AssetWorkOrder[];
  maintenance_plans: AssetMaintenancePlan[];
}

export type QRScanState =
  | 'INITIAL'
  | 'SCANNING'
  | 'PROCESSING'
  | 'LOADING_HISTORY'
  | 'SUCCESS'
  | 'ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR';

export interface QRScanError {
  code: 'INVALID_FORMAT' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK' | 'UNKNOWN';
  message: string;
}
