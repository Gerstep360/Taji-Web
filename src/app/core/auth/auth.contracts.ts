export interface LoginRequest {
  email: string;
  password: string;
  client: 'web';
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  password_confirm: string;
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

export interface MessageResponse {
  message: string;
}
