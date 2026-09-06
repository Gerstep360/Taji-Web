import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, shareReplay, tap, finalize, switchMap, map } from 'rxjs';

import { AuthApi } from './auth.api';
import { RegisterRequest } from './auth.contracts';
import { AuthResponse, User } from './auth.models';
import { SessionHintService } from './session-hint.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly sessionHint = inject(SessionHintService);
  private readonly currentUser = signal<User | null>(null);
  private refreshRequest?: Observable<{ message: string }>;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  async restoreSession(): Promise<void> {
    console.log('AUTH 1 - iniciando restoreSession');

    if (!this.sessionHint.hasSession()) {
      console.log('AUTH 2 - no hay sessionHint');
      this.currentUser.set(null);
      return;
    }

    try {
      console.log('AUTH 3 - consultando /auth/me');

      const response = await firstValueFrom(this.api.me());

      console.log('AUTH 4 - usuario recibido:', response.user);

      this.currentUser.set(response.user);

      console.log('AUTH 5 - usuario establecido');
    } catch (error) {
      console.log('AUTH 6 - error restaurando sesión:', error);
      this.clearSession();
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.login(email, password).pipe(
      tap(() => this.sessionHint.markActive()),
      switchMap((response) => this.api.me().pipe(map((profile) => ({ ...response, user: profile.user })))),
      tap((response) => this.currentUser.set(response.user)),
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.api.register(payload);
  }

  refreshAccess(): Observable<{ message: string }> {
    if (!this.refreshRequest) {
      this.refreshRequest = this.api.refresh().pipe(
        tap(() => this.sessionHint.markActive()),
        shareReplay(1),
        finalize(() => (this.refreshRequest = undefined)),
      );
    }
    return this.refreshRequest;
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.sessionHint.clear();
  }
}

