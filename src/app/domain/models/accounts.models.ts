import { EntityId, IsoDate, IsoDateTime } from './shared.models';

export type DocumentType = 'CI' | 'PASSPORT' | 'OTHER';

export interface Person {
  id: EntityId;
  first_name: string;
  last_name: string;
  document_type: DocumentType;
  document_number: string | null;
  document_complement: string;
  phone: string;
  contact_email: string;
  birth_date: IsoDate | null;
  profile_photo: string;
  is_active: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface SystemPermission {
  id: EntityId;
  code: string;
  name: string;
  description: string;
  module: string;
  is_active: boolean;
}

export interface RolePermission {
  id: EntityId;
  role_id: EntityId;
  permission_id: EntityId;
}
export interface SystemRole {
  id: EntityId;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
  permission_ids: EntityId[];
}

export interface AppUser {
  id: EntityId;
  person_id: EntityId | null;
  role_id: EntityId | null;
  email: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  last_login: IsoDateTime | null;
  date_joined: IsoDateTime;
  updated_at: IsoDateTime;
}