import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { SaasService } from '../../../core/saas/saas.service';
import { SaaSPayment, SubscriptionPlan, TenantSubscription } from '../../../core/saas/saas.models';
import { AuthService } from '../../../core/auth/auth.service';
import { StripePaymentComponent } from '../../../shared/components/stripe-payment/stripe-payment.component';

@Component({
  selector: 'app-tenant-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, StripePaymentComponent],
  templateUrl: './tenant-admin.page.html',
  styleUrl: './tenant-admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantAdminPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly saasService = inject(SaasService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<'suscripcion' | 'datos' | 'pagos'>('suscripcion');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly feedbackMessage = signal('');
  readonly feedbackType = signal<'success' | 'error'>('success');

  // Subscription data
  readonly subscription = signal<TenantSubscription | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly payments = signal<SaaSPayment[]>([]);

  // Checkout modal state
  readonly selectedPlanForCheckout = signal<SubscriptionPlan | null>(null);
  readonly showCheckoutModal = signal(false);

  // Form for condominium details
  readonly condoForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    legal_name: [''],
    address: [''],
    phone: [''],
    email: ['', Validators.email],
    timezone: ['America/La_Paz'],
    rules_summary: [''],
  });

  get activeTenant() {
    return this.authService.activeTenant();
  }

  ngOnInit(): void {
    this.loadAllData();
    this.checkRouteParams();
  }

  setTab(tab: 'suscripcion' | 'datos' | 'pagos'): void {
    this.activeTab.set(tab);
    if (tab === 'pagos') {
      this.loadPayments();
    }
  }

  loadAllData(): void {
    this.loading.set(true);
    this.saasService.getSubscription().subscribe({
      next: (sub) => {
        this.subscription.set(sub);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.saasService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
      },
    });

    // Populate condo form with current active tenant
    const condo = this.activeTenant;
    if (condo) {
      this.condoForm.patchValue({
        name: condo.name || '',
        legal_name: (condo as any).legal_name || '',
        address: (condo as any).address || '',
        phone: (condo as any).phone || '',
        email: (condo as any).email || '',
        timezone: (condo as any).timezone || 'America/La_Paz',
        rules_summary: (condo as any).rules_summary || '',
      });
    }
  }

  loadPayments(): void {
    this.saasService.getPayments().subscribe({
      next: (list) => {
        this.payments.set(list);
      },
    });
  }

  checkRouteParams(): void {
    this.route.queryParams.subscribe((params) => {
      const planId = params['selectPlanId'];
      if (planId) {
        this.saasService.getPlans().subscribe((plans) => {
          const match = plans.find((p) => p.id === Number(planId));
          if (match) {
            this.openCheckout(match);
          }
        });
      }
    });
  }

  openCheckout(plan: SubscriptionPlan): void {
    this.selectedPlanForCheckout.set(plan);
    this.showCheckoutModal.set(true);
  }

  closeCheckout(): void {
    this.showCheckoutModal.set(false);
    this.selectedPlanForCheckout.set(null);
  }

  onPaymentApproved(_payment: SaaSPayment): void {
    this.feedbackMessage.set('¡Pago aprobado con éxito! Tu suscripción y cuotas se han actualizado.');
    this.feedbackType.set('success');
    this.closeCheckout();
    this.loadAllData();
    this.loadPayments();
  }

  saveCondoProfile(): void {
    if (this.condoForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.feedbackMessage.set('');

    this.saasService.updateCondominium(this.condoForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.feedbackMessage.set('Información del condominio guardada correctamente.');
        this.feedbackType.set('success');
      },
      error: () => {
        this.saving.set(false);
        this.feedbackMessage.set('No se pudo actualizar los datos del condominio.');
        this.feedbackType.set('error');
      },
    });
  }

  getUnitPercentage(): number {
    const sub = this.subscription();
    if (!sub || !sub.max_units) return 0;
    return Math.min(100, Math.round((sub.used_units / sub.max_units) * 100));
  }

  getResidentPercentage(): number {
    const sub = this.subscription();
    if (!sub || !sub.max_residents) return 0;
    return Math.min(100, Math.round((sub.used_residents / sub.max_residents) * 100));
  }
}
