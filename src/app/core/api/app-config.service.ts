import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface RuntimeAppConfig {
  apiBaseUrl: string;
  requestTimeoutMs: number;
}

const INITIAL_CONFIG: RuntimeAppConfig = {
  apiBaseUrl: '',
  requestTimeoutMs: 12000,
};

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly state = signal<RuntimeAppConfig>(INITIAL_CONFIG);

  readonly config = this.state.asReadonly();

  async load(): Promise<void> {
    try {
      const loaded = await firstValueFrom(
        this.http.get<Partial<RuntimeAppConfig>>('/config/app-config.json'),
      );
      this.state.set({
        apiBaseUrl: this.normalizeBaseUrl(loaded.apiBaseUrl),
        requestTimeoutMs: this.validTimeout(loaded.requestTimeoutMs),
      });
    } catch (error) {
      this.state.set(INITIAL_CONFIG);
      throw new Error(
        'No se pudo cargar la configuración generada desde Frontend/.env.',
        { cause: error },
      );
    }
  }

  endpoint(path: string): string {
    const baseUrl = this.state().apiBaseUrl;
    if (!baseUrl) throw new Error('La configuración de la API todavía no está disponible.');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  private normalizeBaseUrl(value: string | undefined): string {
    const trimmed = value?.trim().replace(/\/+$/, '') ?? '';
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error('TAJI_API_BASE_URL debe ser una URL HTTP o HTTPS absoluta.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('TAJI_API_BASE_URL no es una URL segura para la API.');
    }
    if (!url.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
      throw new Error('TAJI_API_BASE_URL debe terminar en /api/v1.');
    }
    return trimmed;
  }

  private validTimeout(value: number | undefined): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1000 ? value : INITIAL_CONFIG.requestTimeoutMs;
  }
}
