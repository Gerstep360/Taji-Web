import { Injectable, signal } from '@angular/core';

export type GlobalNotice = {
  message: string;
  tone: 'error' | 'warning';
};

@Injectable({ providedIn: 'root' })
export class GlobalNoticeService {
  private readonly currentNotice = signal<GlobalNotice | null>(null);
  readonly notice = this.currentNotice.asReadonly();
  private clearTimer?: ReturnType<typeof setTimeout>;

  show(message: string, tone: GlobalNotice['tone'] = 'error'): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.currentNotice.set({ message, tone });
    this.clearTimer = setTimeout(() => this.clear(), 6000);
  }

  clear(): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = undefined;
    this.currentNotice.set(null);
  }
}
