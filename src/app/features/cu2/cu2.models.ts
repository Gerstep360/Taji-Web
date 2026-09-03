export interface RolePermission {
  code: string;
  name: string;
  description: string;
  module: string;
  is_active: boolean;
}

export interface RoleDetail {
  slug: string;
  name: string;
  description: string;
  is_active: boolean;
  permissions: RolePermission[];
}

export interface RolePermissionsUpdatePayload {
  permissions: string[];
}

export interface PendingResident {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_joined: string;
  is_approved: boolean;
  is_active: boolean;
}

export interface InternalUserCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  role_slug: string;
}
