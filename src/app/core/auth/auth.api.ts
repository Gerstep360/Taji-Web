import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../api/api-endpoints';
import { ApiClient } from '../api/api-client.service';
import {
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './auth.contracts';
import { AuthResponse, User } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  login(email: string, password: string): Observable<AuthResponse> {
    const request: LoginRequest = { email, password, client: 'web' };
    return this.api.post<LoginRequest, AuthResponse>(API_ENDPOINTS.auth.login, request);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<RegisterRequest, AuthResponse>(API_ENDPOINTS.auth.register, request);
  }

  me(): Observable<{ user: User }> {
    return this.api.get<{ user: User }>(API_ENDPOINTS.auth.me);
  }

  refresh(): Observable<MessageResponse> {
    const request: RefreshRequest = { client: 'web' };
    return this.api.post<RefreshRequest, MessageResponse>(API_ENDPOINTS.auth.refresh, request);
  }

  logout(): Observable<void> {
    return this.api.post<Record<string, never>, void>(API_ENDPOINTS.auth.logout, {});
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    const request: ForgotPasswordRequest = { email };
    return this.api.post<ForgotPasswordRequest, MessageResponse>(API_ENDPOINTS.auth.forgotPassword, request);
  }

  resetPassword(
    uid: string,
    token: string,
    password: string,
    passwordConfirm: string,
  ): Observable<MessageResponse> {
    const request: ResetPasswordRequest = {
      uid,
      token,
      password,
      password_confirm: passwordConfirm,
    };
    return this.api.post<ResetPasswordRequest, MessageResponse>(API_ENDPOINTS.auth.resetPassword, request);
  }
}
