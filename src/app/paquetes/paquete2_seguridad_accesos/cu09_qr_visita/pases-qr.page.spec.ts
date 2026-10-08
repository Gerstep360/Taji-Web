import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client.service';
import { VisitantesApi } from '../cu08_visitantes/visitantes.api';
import { PasesQrPage } from './pases-qr.page';

/**
 * El backend rechaza la emision de un pase con un 400 que explica la causa
 * (`status_not_allowed`, `visit_window_ended`, `ttl_minutes`). Esta pagina lo
 * descartaba y mostraba siempre un texto generico, con lo que el usuario no
 * tenia forma de saber que corregir: si la visita estaba expirada, cancelada o
 * fuera de su ventana.
 */
describe('PasesQrPage: motivo del rechazo del pase QR', () => {
  const apiMock = {
    get: vi.fn(),
    post: vi.fn(),
  };

  const visitantesMock = {
    list: vi.fn(),
    options: vi.fn(),
  };

  const rejection = (fields: Record<string, string[]>, code = 'validation_error') =>
    new HttpErrorResponse({
      status: 400,
      error: {
        error: {
          code,
          message: 'Revisa los campos indicados.',
          fields,
        },
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    visitantesMock.list.mockReturnValue(of({ results: [] }));
    visitantesMock.options.mockReturnValue(of({ statuses: [], document_types: [] }));

    TestBed.configureTestingModule({
      imports: [PasesQrPage],
      providers: [
        { provide: ApiClient, useValue: apiMock },
        { provide: VisitantesApi, useValue: visitantesMock },
      ],
    });
  });

  async function createPage() {
    const fixture = TestBed.createComponent(PasesQrPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('muestra el motivo que devolvio el backend, no un texto generico', async () => {
    apiMock.post.mockReturnValue(
      throwError(() => rejection({ status_not_allowed: ['No se puede emitir un QR para una autorización en estado Expirado.'] })),
    );
    apiMock.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const fixture = await createPage();
    fixture.componentInstance.generateOrFetchQr(7);
    await fixture.whenStable();

    const message = fixture.componentInstance.errorMsg();
    expect(message).toContain('Expirado');
    expect(message).not.toBe('No se pudo generar el pase QR. Verifique el estado de la visita.');
  });

  it('nombra la causa cuando la visita quedo fuera de su ventana de validez', async () => {
    apiMock.post.mockReturnValue(
      throwError(() => rejection({ visit_window_ended: ['El periodo de validez de la visita no permite emitir un QR con vigencia útil.'] })),
    );
    apiMock.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const fixture = await createPage();
    fixture.componentInstance.generateOrFetchQr(7);
    await fixture.whenStable();

    expect(fixture.componentInstance.errorMsg()).toContain('periodo de validez');
  });

  it('aclara que no hay pase emitido cuando el consulta de respaldo responde sin imagen', async () => {
    apiMock.post.mockReturnValue(
      throwError(() => rejection({ visit_window_ended: ['El periodo de validez de la visita no permite emitir un QR con vigencia útil.'] })),
    );
    // La consulta directa si responde, pero sin token en claro no trae imagen.
    apiMock.get.mockReturnValue(of({ id: 7, issued: false, active: false }));

    const fixture = await createPage();
    fixture.componentInstance.generateOrFetchQr(7);
    await fixture.whenStable();

    const message = fixture.componentInstance.errorMsg();
    expect(message).toContain('todavía no tiene un pase QR emitido');
    expect(fixture.componentInstance.getQrImageSrc()).toBeNull();
  });

  it('no inventa un motivo cuando el consulta de respaldo tampoco responde', async () => {
    apiMock.post.mockReturnValue(
      throwError(() => rejection({ status_not_allowed: ['No se puede emitir un QR para una autorización en estado Cancelado.'] })),
    );
    apiMock.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const fixture = await createPage();
    fixture.componentInstance.generateOrFetchQr(7);
    await fixture.whenStable();

    expect(fixture.componentInstance.errorMsg()).toContain('Cancelado');
    expect(fixture.componentInstance.errorMsg()).not.toContain('todavía no tiene');
  });

  it('limpia el mensaje cuando la emision funciona', async () => {
    apiMock.post.mockReturnValue(
      of({
        id: 7,
        issued: true,
        active: true,
        image_base64: 'PHN2Zz48L3N2Zz4=',
        image_media_type: 'image/svg+xml',
      }),
    );

    const fixture = await createPage();
    fixture.componentInstance.errorMsg.set('mensaje anterior');
    fixture.componentInstance.generateOrFetchQr(7);
    await fixture.whenStable();

    expect(fixture.componentInstance.errorMsg()).toBeNull();
    expect(fixture.componentInstance.getQrImageSrc()).toBe('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
  });
});
