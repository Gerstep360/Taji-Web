import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const NON_REFRESHABLE = /\/(login|register|refresh|forgot-password|reset-password)\//;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requestWithCookies = request.clone({ withCredentials: true });

  return next(requestWithCookies).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || NON_REFRESHABLE.test(request.url)) {
        return throwError(() => error);
      }
      return auth.refreshAccess().pipe(
        switchMap(() => next(requestWithCookies)),
        catchError((refreshError: HttpErrorResponse) => {
          auth.clearSession();
          void router.navigateByUrl('/iniciar-sesion');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
