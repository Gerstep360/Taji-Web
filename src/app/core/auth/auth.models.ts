export interface Permission {
  code: string;
}

export interface Role {
  slug: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: Role | null;
  date_joined: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
