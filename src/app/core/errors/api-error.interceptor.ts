import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { GlobalNoticeService } from './global-notice.service';

const PUBLIC_AUTH_REQUEST = /\/(login|register|forgot-password|reset-password)\//;

/** Extrae el mensaje que el backend ya devolvió, con un texto por defecto. */
function errorMessage(error: HttpErrorResponse, fallback: string): string {
  const body = error.error as { detail?: string; error?: { message?: string } } | null;
  return body?.error?.message ?? body?.detail ?? fallback;
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
          void router.navigateByUrl('/acceso-denegado');
          break;
        case 404:
          notices.show('No se encontró el recurso solicitado.', 'warning');
          break;
        case 429:
          // No cae en `default` a propósito: el backend ya envía un mensaje
          // concreto (por ejemplo, cuántos intentos quedan) y redirigir a la
          // página de error 500 sería engañoso, además de perder el formulario.
          notices.show(
            errorMessage(error, 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'),
            'warning',
          );
          break;
        case 502:
          // Una dependencia externa falló (por ejemplo, el servidor SMTP al
          // enviar una invitación). No es una caída de la aplicación, así que
          // se informa sin sacar al usuario de la página donde está: perder el
          // contexto justo cuando va a reintentar sería contraproducente.
          notices.show(errorMessage(error, 'Un servicio externo no respondió. Intenta nuevamente.'), 'warning');
          break;
        default:
          if (error.status >= 500) void router.navigateByUrl('/error-servidor');
      }

      return throwError(() => error);
    }),
  );
};
