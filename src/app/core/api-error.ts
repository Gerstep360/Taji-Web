import { HttpErrorResponse } from '@angular/common/http';

type ErrorEnvelope = {
  code?: unknown;
  message?: unknown;
  fields?: unknown;
};

export function apiErrorMessage(
  error: unknown,
  fallback = 'No pudimos completar la acción. Intenta nuevamente.',
): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  const body = error.error as Record<string, unknown> | null;
  const envelope = body?.['error'] as ErrorEnvelope | undefined;
  if (envelope && typeof envelope === 'object') {
    const [field, message] = Object.entries(normalizeFieldErrors(envelope.fields))[0] ?? [];
    if (field && message) return `${fieldLabel(field)}: ${message}`;
  }

  if (typeof body?.['detail'] === 'string') return body['detail'];
  if (envelope && typeof envelope.message === 'string') return envelope.message;

  if (typeof body?.['message'] === 'string') return body['message'];
  const [field, message] = Object.entries(normalizeFieldErrors(body))[0] ?? [];
  return field && message ? `${fieldLabel(field)}: ${message}` : fallback;
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse)) return {};
  const body = error.error as Record<string, unknown> | null;
  const envelope = body?.['error'] as ErrorEnvelope | undefined;
  if (envelope && typeof envelope === 'object') return normalizeFieldErrors(envelope.fields);
  return normalizeFieldErrors(body);
}

function normalizeFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const errors: Record<string, string> = {};
  for (const [field, raw] of Object.entries(value as Record<string, unknown>)) {
    const message = Array.isArray(raw) ? raw.find((item) => typeof item === 'string') : raw;
    if (typeof message === 'string') errors[field] = message;
  }
  return errors;
}

function fieldLabel(field: string): string {
  return {
    email: 'Correo',
    first_name: 'Nombres',
    last_name: 'Apellidos',
    phone: 'Teléfono',
    password: 'Contraseña',
    password_confirm: 'Confirmación',
    token: 'Enlace',
  }[field] ?? 'Datos';
}
