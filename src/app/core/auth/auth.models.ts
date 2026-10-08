export interface Permission {
  code: string;
}

export interface Role {
  slug: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  address?: string;
  role_name?: string;
  is_default?: boolean;
}

export interface User {
  id: number;
  email: string;
  is_superuser: boolean;
  is_approved: boolean;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: Role | null;
  date_joined: string;
  /**
   * True mientras la cuenta use la contraseña temporal entregada por la
   * administración. El layout obliga a pasar por el cambio de clave.
   */
  must_change_password?: boolean;
  resident_units?: ResidentUnitSummary[];
  linked_residents?: LinkedResident[];
  active_tenant?: TenantInfo | null;
  available_tenants?: TenantInfo[];
}

export interface ResidentUnitSummary {
  id: number;
  unit_id: number;
  unit_code: string;
  relation_type: string;
  relation_type_display: string;
  is_primary: boolean;
  start_date: string;
}

export interface LinkedResident {
  resident_id: number;
  full_name: string;
  unit_code: string;
  relation_type: string;
  relation_type_display: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  /** Presente y `true` cuando el ingreso usó una contraseña temporal. */
  must_change_password?: boolean;
}

export interface MeResponse {
  user: User;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
