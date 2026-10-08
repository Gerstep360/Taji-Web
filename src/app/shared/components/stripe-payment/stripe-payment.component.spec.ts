import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StripePaymentComponent } from './stripe-payment.component';
import { SaasService } from '../../../core/saas/saas.service';
import { SaaSPayment, StripeIntentResponse } from '../../../core/saas/saas.models';

/**
 * Fija el contrato funcional del componente de pago.
 *
 * El rediseño visual no debe alterar la forma en que se paga: estas pruebas
 * comprueban que el componente sigue pidiendo el intent, que emite `paid` con
 * el pago del backend y que mantiene el respaldo de pago simulado cuando la red
 * falla, que es lo que permite hacer la demostración sin internet.
 */
describe('StripePaymentComponent (contrato funcional)', () => {
  let fixture: ComponentFixture<StripePaymentComponent>;
  let component: StripePaymentComponent;

  const intent: StripeIntentResponse = {
    payment_id: 77,
    provider: 'stripe',
    payment_intent_id: 'pi_test_1',
    client_secret: '',
    publishable_key: '',
    amount: 99,
    currency: 'bob',
    status: 'PENDIENTE',
    sandbox: true,
    plan_name: 'Esencial',
    condominium_name: 'Condominio Taji',
  } as StripeIntentResponse;

  const payment: SaaSPayment = {
    id: 77,
    condominium_id: 1,
    plan_id: 1,
    plan_name: 'Esencial',
    amount: 99,
    currency: 'BOB',
    provider: 'stripe',
    status: 'APROBADO',
    payment_intent_id: 'pi_test_1',
    created_at: '2026-10-08T00:00:00Z',
    updated_at: '2026-10-08T00:00:00Z',
  };

  let createIntent: ReturnType<typeof vi.fn>;
  let confirmSandbox: ReturnType<typeof vi.fn>;

  function build(): void {
    createIntent = vi.fn().mockReturnValue(of(intent));
    confirmSandbox = vi.fn().mockReturnValue(of(payment));

    TestBed.configureTestingModule({
      imports: [StripePaymentComponent],
      providers: [
        {
          provide: SaasService,
          useValue: { createIntent, confirmSandbox },
        },
      ],
    });

    fixture = TestBed.createComponent(StripePaymentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('planId', 1);
    fixture.componentRef.setInput('planName', 'Esencial');
    fixture.componentRef.setInput('amount', 99);
  }

  beforeEach(() => {
    build();
  });

  it('pide el intent al inicializar con el plan recibido', async () => {
    await fixture.whenStable();

    expect(createIntent).toHaveBeenCalledWith(1, undefined);
  });

  it('entra en modo simulación cuando la clave publicada no es real', async () => {
    await fixture.whenStable();

    expect(component.isSandbox()).toBe(true);
    expect(component.ready()).toBe(true);
  });

  it('emite paid con el pago confirmado por el backend', async () => {
    await fixture.whenStable();
    const paid = vi.fn();
    component.paid.subscribe(paid);

    await component.paySandbox();

    expect(confirmSandbox).toHaveBeenCalledWith(77, 1, undefined);
    expect(paid).toHaveBeenCalledWith(payment);
    expect(component.approved()).toBe(true);
  });

  it('confirma el pago simulado aunque el backend falle', async () => {
    // Esta es la red de seguridad de la demostración: sin internet, el pago se
    // registra en local para poder seguir enseñando el flujo.
    confirmSandbox.mockReturnValue(throwError(() => new Error('sin red')));
    await fixture.whenStable();
    const paid = vi.fn();
    component.paid.subscribe(paid);

    await component.paySandbox();

    expect(paid).toHaveBeenCalledTimes(1);
    expect(component.approved()).toBe(true);
  });

  it('emite canceled sin tocar nada más', async () => {
    await fixture.whenStable();
    const canceled = vi.fn();
    component.canceled.subscribe(canceled);

    component.cancel();

    expect(canceled).toHaveBeenCalledTimes(1);
  });

  it('cambia la tarjeta de prueba y su marca', () => {
    component.changeTestCard('mc_ok');

    expect(component.selectedBrand()).toBe('MASTERCARD');
    expect(component.cardNumber()).toContain('5555');

    component.changeTestCard('visa_ok');

    expect(component.selectedBrand()).toBe('VISA');
    expect(component.cardNumber()).toContain('4242');
  });

  it('expone el importe y el plan como los recibe el padre', () => {
    expect(component.planName()).toBe('Esencial');
    expect(component.amount()).toBe(99);
  });

  it('muestra el estado de éxito tras aprobar', async () => {
    await fixture.whenStable();

    await component.paySandbox();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Suscripción activada');
  });
});
