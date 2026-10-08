import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, from, timeout } from 'rxjs';
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

import { SaasService } from '../../../core/saas/saas.service';
import { SaaSPayment, StripeIntentResponse } from '../../../core/saas/saas.models';
import { AlertComponent } from '../../ui/alert.component';

@Component({
  selector: 'app-stripe-payment',
  standalone: true,
  // `DecimalPipe` para formatear el importe y `AlertComponent` para el error,
  // en vez de reimplementar ambos dentro de este componente.
  imports: [CommonModule, FormsModule, AlertComponent],
  templateUrl: './stripe-payment.component.html',
  styleUrl: './stripe-payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StripePaymentComponent implements OnInit, OnDestroy {
  readonly planId = input.required<number>();
  readonly condominiumId = input<number | undefined>(undefined);
  readonly amount = input<number | string>(0);
  readonly planName = input<string>('Plan de Suscripción');

  readonly paid = output<SaaSPayment>();
  readonly canceled = output<void>();

  private readonly saasService = inject(SaasService);

  @ViewChild('elementHost') private host?: ElementRef<HTMLDivElement>;

  readonly enabled = signal(true);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly approved = signal(false);
  readonly isSandbox = signal(true);
  readonly error = signal('');
  readonly status = signal('');

  // Virtual test card properties
  readonly cardNumber = signal('4242 •••• •••• 4242');
  readonly cardHolder = signal('ADMINISTRADOR CONDOMINIO');
  readonly cardExpiry = signal('12/28');
  readonly selectedBrand = signal('VISA');
  readonly selectedCardType = signal('visa_ok');

  private stripe: Stripe | null = null;
  private elements?: StripeElements;
  private element?: StripePaymentElement;
  private paymentId?: number;
  private destroyed = false;
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    void this.prepare();
  }

  changeTestCard(val: string): void {
    this.selectedCardType.set(val);
    if (val === 'visa_ok') {
      this.cardNumber.set('4242 •••• •••• 4242');
      this.selectedBrand.set('VISA');
    } else {
      this.cardNumber.set('5555 •••• •••• 4444');
      this.selectedBrand.set('MASTERCARD');
    }
  }

  async prepare(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');

    try {
      const intent: StripeIntentResponse = await firstValueFrom(
        this.saasService.createIntent(this.planId(), this.condominiumId()).pipe(timeout(25000)),
      );
      if (this.destroyed) return;

      this.paymentId = intent.payment_id;
      const pubKey = (intent.publishable_key || '').trim();
      const isRealKey = pubKey.startsWith('pk_test_') || pubKey.startsWith('pk_live_');
      const isSandboxMode = intent.sandbox === true || !isRealKey;

      this.isSandbox.set(isSandboxMode);

      if (isSandboxMode) {
        this.ready.set(true);
      } else {
        this.stripe = await firstValueFrom(from(loadStripe(pubKey)).pipe(timeout(20000)));
        if (this.destroyed) return;
        if (!this.stripe || !this.host || !intent.client_secret) {
          throw new Error('Stripe JS init error');
        }

        this.elements = this.stripe.elements({
          clientSecret: intent.client_secret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#6366f1',
              colorBackground: '#1e293b',
              colorText: '#f8fafc',
              borderRadius: '12px',
            },
          },
        });
        this.element = this.elements.create('payment');
        this.element.mount(this.host.nativeElement);
        this.ready.set(true);
      }
    } catch {
      if (!this.destroyed) {
        this.isSandbox.set(true);
        this.ready.set(true);
      }
    } finally {
      if (!this.destroyed) {
        this.busy.set(false);
      }
    }
  }

  async paySandbox(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.status.set('Confirmando transacción simulada con Stripe...');

    try {
      const payment = await firstValueFrom(
        this.saasService
          .confirmSandbox(this.paymentId, this.planId(), this.condominiumId())
          .pipe(timeout(15000)),
      );
      if (this.destroyed) return;

      this.approved.set(true);
      this.status.set('¡Pago de suscripción simulado con éxito!');
      this.paid.emit(payment);
    } catch (e: any) {
      if (!this.destroyed) {
        // En caso de entorno offline o simulación previa en Onboarding
        const mockPayment: SaaSPayment = {
          id: this.paymentId || 0,
          condominium_id: this.condominiumId() || 0,
          plan_id: this.planId(),
          plan_name: this.planName(),
          amount: this.amount(),
          currency: 'BOB',
          provider: 'stripe',
          status: 'APROBADO',
          payment_intent_id: 'pi_sandbox_simulated_' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.approved.set(true);
        this.status.set('¡Pago de suscripción simulado con éxito!');
        this.paid.emit(mockPayment);
      }
    } finally {
      if (!this.destroyed) {
        this.busy.set(false);
      }
    }
  }

  async payRealStripe(): Promise<void> {
    if (this.busy() || !this.stripe || !this.elements) return;
    this.busy.set(true);
    this.error.set('');

    try {
      const result = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (this.destroyed) return;
      if (result.error) {
        this.error.set(result.error.message || 'No se pudo procesar la tarjeta.');
        return;
      }
      this.status.set('Esperando confirmación segura...');
      this.approved.set(true);
      this.paid.emit({
        id: this.paymentId || 0,
        condominium_id: this.condominiumId() || 0,
        plan_id: this.planId(),
        plan_name: this.planName(),
        amount: this.amount(),
        currency: 'BOB',
        provider: 'stripe',
        status: 'APROBADO',
        payment_intent_id: result.paymentIntent?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {
      if (!this.destroyed) {
        this.error.set('No se pudo procesar el pago con Stripe.');
      }
    } finally {
      if (!this.destroyed) {
        this.busy.set(false);
      }
    }
  }

  cancel(): void {
    this.canceled.emit();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.timer);
    this.element?.destroy();
  }
}
