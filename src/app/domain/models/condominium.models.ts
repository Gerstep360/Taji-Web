import { EntityId, IsoDate, IsoDateTime } from './shared.models';

export type SectorType = 'SECTOR' | 'BLOCK' | 'TOWER' | 'FLOOR' | 'ZONE' | 'OTHER';
export type UnitType = 'HOUSE' | 'APARTMENT' | 'OFFICE' | 'STORE' | 'OTHER';
export type UnitStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type ResidentStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type ResidentRelation = 'OWNER' | 'TENANT' | 'FAMILY' | 'AUTHORIZED' | 'OTHER';
export type StaffType = 'ADMINISTRATION' | 'SECURITY' | 'MAINTENANCE' | 'CLEANING' | 'OTHER';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Condominium {
  id: EntityId; name: string; legal_name: string; address: string; phone: string;
  email: string; timezone: string; logo: string; rules_summary: string;
  is_active: boolean; created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface Sector {
  id: EntityId; condominium_id: EntityId; parent_id: EntityId | null; code: string;
  name: string; sector_type: SectorType; description: string; is_active: boolean;
  created_at: IsoDateTime;
}
export interface Unit {
  id: EntityId; sector_id: EntityId | null; code: string; unit_type: UnitType;
  floor_label: string; description: string; status: UnitStatus;
  created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface Resident {
  id: EntityId; person_id: EntityId; status: ResidentStatus; notes: string;
  registered_at: IsoDateTime; deactivated_at: IsoDateTime | null;
}
export interface ResidentUnit {
  id: EntityId; resident_id: EntityId; unit_id: EntityId; relation_type: ResidentRelation;
  is_primary: boolean; start_date: IsoDate; end_date: IsoDate | null; created_at: IsoDateTime;
}
export interface Staff {
  id: EntityId; person_id: EntityId; employee_code: string | null; staff_type: StaffType;
  hire_date: IsoDate | null; end_date: IsoDate | null; status: StaffStatus; notes: string;
}