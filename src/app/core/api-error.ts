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
    const fieldMessage = firstFieldMessage(envelope.fields);
    if (fieldMessage) return fieldMessage;
    if (typeof envelope.message === 'string') return envelope.message;
  }

  if (typeof body?.['detail'] === 'string') return body['detail'];

  const envelope = body?.['error'] as ErrorEnvelope | undefined;
  if (envelope && typeof envelope === 'object') {
    const fieldMessage = firstFieldMessage(envelope.fields);
    if (fieldMessage) return fieldMessage;
    if (typeof envelope.message === 'string') return envelope.message;
  }

  if (typeof body?.['message'] === 'string') return body['message'];
  const legacyField = firstFieldMessage(body);
  return legacyField || fallback;
}

function firstFieldMessage(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  for (const [field, raw] of Object.entries(value as Record<string, unknown>)) {
    const message = Array.isArray(raw) ? raw.find((item) => typeof item === 'string') : raw;
    if (typeof message === 'string') return `${fieldLabel(field)}: ${message}`;
  }
  return '';
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
