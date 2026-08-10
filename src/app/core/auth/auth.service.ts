import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, shareReplay, tap, finalize } from 'rxjs';

import { AuthApi } from './auth.api';
import { RegisterRequest } from './auth.contracts';
import { AuthResponse, User } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly currentUser = signal<User | null>(null);
  private refreshRequest?: Observable<{ message: string }>;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  async restoreSession(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.me());
      this.currentUser.set(response.user);
    } catch {
      this.currentUser.set(null);
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.login(email, password).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.api.register(payload);
  }

  refreshAccess(): Observable<{ message: string }> {
    if (!this.refreshRequest) {
      this.refreshRequest = this.api.refresh().pipe(
        shareReplay(1),
        finalize(() => (this.refreshRequest = undefined)),
      );
    }
    return this.refreshRequest;
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(tap(() => this.currentUser.set(null)));
  }

  clearSession(): void {
    this.currentUser.set(null);
  }
}

