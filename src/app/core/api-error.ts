import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback = 'No pudimos completar la acción. Intenta nuevamente.'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  const body = error.error as Record<string, unknown> | null;
  if (typeof body?.['detail'] === 'string') return body['detail'];
  if (typeof body?.['message'] === 'string') return body['message'];
  for (const value of Object.values(body ?? {})) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}
