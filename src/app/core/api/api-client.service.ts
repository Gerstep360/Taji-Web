import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpContext, HttpContextToken } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

import { AppConfigService } from './app-config.service';

export interface ApiRequestOptions {
  context?: HttpContext;
  headers?: HttpHeaders;
  params?: HttpParams;
}
export const KEEP_PAGE_ON_SERVER_ERROR = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  get<TResponse>(path: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.withTimeout(this.http.get<TResponse>(this.appConfig.endpoint(path), options));
  }

  post<TRequest, TResponse>(path: string, body: TRequest, options?: ApiRequestOptions): Observable<TResponse> {
    return this.withTimeout(this.http.post<TResponse>(this.appConfig.endpoint(path), body, options));
  }

  put<TRequest, TResponse>(path: string, body: TRequest, options?: ApiRequestOptions): Observable<TResponse> {
    return this.withTimeout(this.http.put<TResponse>(this.appConfig.endpoint(path), body, options));
  }

  patch<TRequest, TResponse>(path: string, body: TRequest, options?: ApiRequestOptions): Observable<TResponse> {
    return this.withTimeout(this.http.patch<TResponse>(this.appConfig.endpoint(path), body, options));
  }

  delete<TResponse>(path: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.withTimeout(this.http.delete<TResponse>(this.appConfig.endpoint(path), options));
  }

  private withTimeout<T>(request: Observable<T>): Observable<T> {
    return request.pipe(timeout(this.appConfig.config().requestTimeoutMs));
  }

  postBlob<TRequest>(path: string, body: TRequest, options?: ApiRequestOptions): Observable<Blob> {
    return this.withTimeout(this.http.post(this.appConfig.endpoint(path), body, { ...options, responseType: 'blob' }));
  }
}
