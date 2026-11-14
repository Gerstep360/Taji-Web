import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { GlobalNoticeService } from './global-notice.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notices = inject(GlobalNoticeService);

  handleError(error: unknown): void {
    // Los errores HTTP ya son manejados por el interceptor (apiErrorInterceptor).
    if (error instanceof HttpErrorResponse) {
      return;
    }

    // Ignorar errores de streams / Response body ya consumidos generados por fetch/interceptor/navegador
    if (error instanceof TypeError) {
      const msg = error.message || '';
      if (msg.includes('Response body is already used') || msg.includes('body stream already read')) {
        return;
      }
    }

    // Para errores críticos de renderizado de la UI, mostrar aviso sin interrumpir flujos de datos de la API
    console.error('Error no controlado en la aplicación:', error);
  }
}
