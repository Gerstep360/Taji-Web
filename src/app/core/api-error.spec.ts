import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage, apiFieldErrors } from './api-error';

describe('apiErrorMessage', () => {
  it('reads the uniform backend validation envelope', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        error: {
          code: 'validation_error',
          message: 'Revisa los campos indicados.',
          fields: { email: ['Ya existe una cuenta con este correo.'] },
        },
      },
    });

    expect(apiErrorMessage(error)).toBe('Correo: Ya existe una cuenta con este correo.');
    expect(apiFieldErrors(error)).toEqual({ email: 'Ya existe una cuenta con este correo.' });
  });

  it('keeps compatibility with legacy detail responses', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { detail: 'Sesión inválida.' },
    });

    expect(apiErrorMessage(error)).toBe('Sesión inválida.');
  });

  it('prioritizes login details over the generic error envelope', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: {
        detail: 'Usuario no encontrado o no registrado. Regístrate para continuar.',
        error: { code: 'authentication_failed', message: 'Correo o contraseña incorrectos.' },
      },
    });

    expect(apiErrorMessage(error)).toBe('Usuario no encontrado o no registrado. Regístrate para continuar.');
  });
});
