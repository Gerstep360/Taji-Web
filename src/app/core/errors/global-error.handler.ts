import { ErrorHandler, Injectable, inject } from '@angular/core';

import { GlobalNoticeService } from './global-notice.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notices = inject(GlobalNoticeService);

  handleError(_error: unknown): void {
    this.notices.show('Ocurrió un error inesperado en la aplicación. Intenta recargar la página.');
  }
}
