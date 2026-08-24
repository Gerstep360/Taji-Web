import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { GlobalNoticeService } from './global-notice.service';

const PUBLIC_AUTH_REQUEST = /\/(login|register|forgot-password|reset-password)\//;

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
        default:
          if (error.status >= 500) void router.navigateByUrl('/error-servidor');
      }

      return throwError(() => error);
    }),
  );
};
