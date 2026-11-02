import { HttpContext, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { HANDLE_ERRORS_LOCALLY, apiErrorInterceptor } from './api-error.interceptor';
import { GlobalNoticeService } from './global-notice.service';

describe('apiErrorInterceptor local error handling', () => {
  const router = { navigateByUrl: vi.fn(), navigate: vi.fn() };
  const notices = { show: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: GlobalNoticeService, useValue: notices },
        { provide: AuthService, useValue: { clearSession: vi.fn() } },
      ],
    });
  });

  async function fail(status: number, local: boolean): Promise<void> {
    const context = local ? new HttpContext().set(HANDLE_ERRORS_LOCALLY, true) : new HttpContext();
    const request = new HttpRequest('POST', '/api/v1/incidents/', null, { context });
    const next = () => throwError(() => new HttpErrorResponse({ status, url: request.url }));
    await expect(
      TestBed.runInInjectionContext(() => firstValueFrom(apiErrorInterceptor(request, next))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
  }

  it('keeps redirecting 403 and 5xx by default', async () => {
    await fail(403, false);
    await fail(503, false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/acceso-denegado');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/error-servidor');
  });

  it('lets an opted-in request handle 403 and 5xx without leaving the page', async () => {
    await fail(403, true);
    await fail(503, true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
