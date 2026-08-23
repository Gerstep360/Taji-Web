import { Injectable } from '@angular/core';

const SESSION_HINT_KEY = 'taji.auth.has-session';

/**
 * Stores only a non-sensitive hint. Authentication remains in HttpOnly cookies;
 * this marker prevents unnecessary /me and /refresh calls for signed-out users.
 */
@Injectable({ providedIn: 'root' })
export class SessionHintService {
  hasSession(): boolean {
    return this.storage()?.getItem(SESSION_HINT_KEY) === '1';
  }

  markActive(): void {
    this.storage()?.setItem(SESSION_HINT_KEY, '1');
  }

  clear(): void {
    this.storage()?.removeItem(SESSION_HINT_KEY);
  }

  private storage(): Storage | null {
    try {
      return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
    } catch {
      return null;
    }
  }
}
