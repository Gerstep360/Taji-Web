import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { GlobalNoticeService } from './global-notice.service';

const PUBLIC_AUTH_REQUEST = /\/(login|register|forgot-password|reset-password)\//;

/**
 * Marca una petición cuyo 403 y 5xx los muestra la propia pantalla.
 */
export const HANDLE_ERRORS_LOCALLY = new HttpContextToken<boolean>(() => false);

/** Extrae el mensaje que el backend ya devolvió, de forma segura sin consumir streams ya leídos. */
function errorMessage(error: HttpErrorResponse, fallback: string): string {
  try {
    const body = error.error;
    if (!body) return fallback;
    if (typeof body === 'string') return body;
    if (typeof body === 'object') {
      const errObj = body as { detail?: string; error?: { message?: string } };
      return errObj.error?.message ?? errObj.detail ?? fallback;
    }
  } catch {
    // Previene TypeError: Failed to execute 'clone' on 'Response' / body already used
  }
  return fallback;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const notices = inject(GlobalNoticeService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        notices.show('La solicitud tardó demasiado. Intenta nuevamente.');
        return throwError(() => error);
      }

      switch (error.status) {
        case 0:
          notices.show('No fue posible comunicarse con el servidor. Revisa tu conexión.');
          break;
        case 400:
          notices.show('La solicitud contiene datos inválidos. Revisa la información enviada.', 'warning');
          break;
        case 401:
          if (!PUBLIC_AUTH_REQUEST.test(request.url)) {
            auth.clearSession();
            notices.show('Tu sesión venció. Inicia sesión nuevamente.', 'warning');
            void router.navigate(['/iniciar-sesion'], { queryParams: { sessionExpired: true } });
          }
          break;
        case 403:
          if (!request.context.get(HANDLE_ERRORS_LOCALLY)) void router.navigateByUrl('/acceso-denegado');
          break;
        case 404:
          // No mostrar avisos intrusivos en peticiones GET (como búsquedas o listados que la UI maneja de forma vacía)
          if (request.method !== 'GET' && !request.context.get(HANDLE_ERRORS_LOCALLY)) {
            notices.show('No se encontró el recurso solicitado.', 'warning');
          }
          break;
        case 429:
          notices.show(
            errorMessage(error, 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'),
            'warning',
          );
          break;
        case 502:
          notices.show(errorMessage(error, 'Un servicio externo no respondió. Intenta nuevamente.'), 'warning');
          break;
        default:
          if (error.status >= 500 && !request.context.get(HANDLE_ERRORS_LOCALLY)) {
            void router.navigateByUrl('/error-servidor');
          }
      }

      return throwError(() => error);
    }),
  );
};
