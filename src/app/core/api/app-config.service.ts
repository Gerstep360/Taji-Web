import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface RuntimeAppConfig {
  apiBaseUrl: string;
  requestTimeoutMs: number;
}

const DEFAULT_CONFIG: RuntimeAppConfig = {
  apiBaseUrl: '/api/v1',
  requestTimeoutMs: 12000,
};

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly state = signal<RuntimeAppConfig>(DEFAULT_CONFIG);

  readonly config = this.state.asReadonly();

  async load(): Promise<void> {
    try {
      const loaded = await firstValueFrom(
        this.http.get<Partial<RuntimeAppConfig>>('/config/app-config.json'),
      );
      this.state.set({
        apiBaseUrl: this.normalizeBaseUrl(loaded.apiBaseUrl ?? DEFAULT_CONFIG.apiBaseUrl),
        requestTimeoutMs: this.validTimeout(loaded.requestTimeoutMs),
      });
    } catch {
      this.state.set(DEFAULT_CONFIG);
    }
  }

  endpoint(path: string): string {
    const baseUrl = this.state().apiBaseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  private normalizeBaseUrl(value: string): string {
    const trimmed = value.trim().replace(/\/$/, '');
    return trimmed || DEFAULT_CONFIG.apiBaseUrl;
  }

  private validTimeout(value: number | undefined): number {
    return typeof value === 'number' && value >= 1000 ? value : DEFAULT_CONFIG.requestTimeoutMs;
  }
}
