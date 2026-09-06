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
        this.http.get<Partial<RuntimeAppConfig>>('config/app-config.json'),
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
    let trimmed = value?.trim().replace(/\/+$/, '') ?? '';

    // Sanitizar automáticamente el puerto interno :8000 si está configurado en producción
    if (trimmed.includes(':8000')) {
      trimmed = trimmed.replace(':8000/api/v1', '/taji/api/v1').replace(':8000', '');
    }

    // Convertir https a http para direcciones IP puras (los certificados SSL no aplican a IPs)
    trimmed = trimmed.replace(/^https:\/\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/, 'http://$1');

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
