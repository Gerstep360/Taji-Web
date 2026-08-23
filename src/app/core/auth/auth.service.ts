import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, shareReplay, tap, finalize } from 'rxjs';

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
    if (!this.sessionHint.hasSession()) {
      this.currentUser.set(null);
      return;
    }

    try {
      const response = await firstValueFrom(this.api.me());
      this.currentUser.set(response.user);
    } catch {
      this.clearSession();
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.login(email, password).pipe(
      tap((response) => {
        this.currentUser.set(response.user);
        this.sessionHint.markActive();
      }),
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

