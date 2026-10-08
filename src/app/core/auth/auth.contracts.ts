export interface LoginRequest {
  email: string;
  password: string;
  client: 'web';
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  password_confirm: string;
  condominium_id?: number | null;
  condominium_code?: string;
  unit_label?: string;
}

export interface RefreshRequest {
  client: 'web';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  uid: string;
  token: string;
  password: string;
  password_confirm: string;
}

/** Cambio de contraseña del usuario ya autenticado (cierra el alta temporal). */
export interface ChangePasswordRequest {
  current_password: string;
  password: string;
  password_confirm: string;
}

export interface MessageResponse {
  message: string;
}
