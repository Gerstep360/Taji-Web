import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ApiClient } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { SessionHintService } from '../auth/session-hint.service';
import {
  PaymentConfig,
  SaaSCondominiumRegisterPayload,
  SaaSCondominiumRegisterResponse,
  SaaSPayment,
  StripeIntentResponse,
  SubscriptionPlan,
  TenantSubscription,
  UpdateCondominiumPayload,
} from './saas.models';

@Injectable({ providedIn: 'root' })
export class SaasService {
  private readonly api = inject(ApiClient);
  private readonly sessionHint = inject(SessionHintService);

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.api.get<SubscriptionPlan[]>(API_ENDPOINTS.saas.plans);
  }

  getPaymentConfig(): Observable<PaymentConfig> {
    return this.api.get<PaymentConfig>(API_ENDPOINTS.saas.paymentConfig);
  }

  getSubscription(): Observable<TenantSubscription> {
    return this.api.get<TenantSubscription>(API_ENDPOINTS.saas.subscription);
  }

  createIntent(planId: number, condominiumId?: number): Observable<StripeIntentResponse> {
    return this.api.post<{ plan_id: number; condominium_id?: number }, StripeIntentResponse>(
      API_ENDPOINTS.saas.createIntent,
      {
        plan_id: planId,
        condominium_id: condominiumId,
      },
    );
  }

  confirmSandbox(paymentId?: number | null, planId?: number, condominiumId?: number): Observable<SaaSPayment> {
    return this.api.post<{ payment_id?: number | null; plan_id?: number; condominium_id?: number }, SaaSPayment>(
      API_ENDPOINTS.saas.confirmSandbox,
      {
        payment_id: paymentId || null,
        plan_id: planId,
        condominium_id: condominiumId,
      },
    );
  }

  getPayments(): Observable<SaaSPayment[]> {
    return this.api.get<SaaSPayment[]>(API_ENDPOINTS.saas.payments);
  }

  updateCondominium(payload: UpdateCondominiumPayload): Observable<any> {
    return this.api.patch<UpdateCondominiumPayload, any>(
      API_ENDPOINTS.saas.myCondominium,
      payload,
    );
  }

  registerCondominium(payload: SaaSCondominiumRegisterPayload): Observable<SaaSCondominiumRegisterResponse> {
    return this.api
      .post<SaaSCondominiumRegisterPayload, SaaSCondominiumRegisterResponse>(
        API_ENDPOINTS.saas.onboardingRegister,
        payload,
      )
      .pipe(tap(() => this.sessionHint.markActive()));
  }

  getPublicCondominiums(): Observable<Array<{ id: number; name: string; slug: string; address: string; phone: string }>> {
    return this.api.get<Array<{ id: number; name: string; slug: string; address: string; phone: string }>>(
      API_ENDPOINTS.saas.publicCondominiums,
    );
  }
}
