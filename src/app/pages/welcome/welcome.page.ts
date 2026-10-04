import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { SaasService } from '../../core/saas/saas.service';
import { SaaSPayment, SubscriptionPlan } from '../../core/saas/saas.models';
import { AuthService } from '../../core/auth/auth.service';
import { LogoComponent } from '../../shared/ui/logo.component';
import { StripePaymentComponent } from '../../shared/components/stripe-payment/stripe-payment.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LogoComponent, StripePaymentComponent],
  templateUrl: './welcome.page.html',
  styleUrl: './welcome.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage implements OnInit {
  private readonly saasService = inject(SaasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly isLoading = signal(true);
  readonly isAnnual = signal(false);
  readonly isAuthenticated = signal(false);

  // Community Simulator / Configurator
  readonly selectedUnitRange = signal<'small' | 'medium' | 'large'>('medium');

  // Onboarding Modal state
  readonly showOnboardingModal = signal(false);
  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly onboardingStep = signal<1 | 2 | 3>(1);
  readonly onboardingSaving = signal(false);
  readonly onboardingError = signal('');
  readonly onboardingSuccess = signal('');
  readonly stripePaymentCompleted = signal<SaaSPayment | null>(null);

  readonly onboardingForm: FormGroup = this.fb.group({
    condominium_name: ['', [Validators.required, Validators.minLength(3)]],
    condominium_code: [''],
    estimated_units: [40, [Validators.min(1)]],
    address: [''],
    phone: [''],
    admin_name: ['', [Validators.required, Validators.minLength(3)]],
    admin_document: [''],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_phone: [''],
    admin_password: ['', [Validators.required, Validators.minLength(8)]],
    admin_password_confirm: ['', [Validators.required, Validators.minLength(8)]],
    payment_method: ['TRIAL', Validators.required],
  });

  readonly recommendedPlan = computed(() => {
    const range = this.selectedUnitRange();
    const all = this.plans();
    if (!all.length) return null;
    if (range === 'small') {
      return all.find((p) => p.code === 'esencial') || all[0];
    } else if (range === 'medium') {
      return all.find((p) => p.code === 'profesional') || all[1] || all[0];
    } else {
      return all.find((p) => p.code === 'corporativo') || all[all.length - 1];
    }
  });

  ngOnInit(): void {
    this.isAuthenticated.set(this.authService.isAuthenticated());
    this.loadPlans();

    // Auto-generate condominium code slug when name changes if user hasn't typed a custom code
    this.onboardingForm.get('condominium_name')?.valueChanges.subscribe((name: string) => {
      const codeControl = this.onboardingForm.get('condominium_code');
      if (codeControl && !codeControl.dirty) {
        const slug = (name || '')
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        codeControl.setValue(slug, { emitEvent: false });
      }
    });
  }

  loadPlans(): void {
    this.isLoading.set(true);
    this.saasService.getPlans().subscribe({
      next: (data) => {
        this.plans.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback default plans
        this.plans.set([
          {
            id: 1,
            code: 'esencial',
            name: 'Plan Esencial',
            tagline: 'Control de visitas con pases QR rápidos y administración centralizada.',
            description: 'Para condominios pequeños que requieren control de visitas y bitácora segura.',
            price_bob: 150,
            price_usd: 22,
            billing_period: 'MONTHLY',
            max_units: 30,
            max_residents: 100,
            features: [
              'Hasta 30 unidades o departamentos',
              'Pases de visita con Código QR instantáneo',
              'Gestión de residentes y vehículos',
              'Bitácora digital de accesos en tiempo real',
              'Soporte técnico por correo electrónico',
            ],
            is_popular: false,
            is_active: true,
            order: 1,
          },
          {
            id: 2,
            code: 'profesional',
            name: 'Plan Profesional',
            tagline: 'Seguridad biométrica facial, pases QR, control financiero con Stripe y reservas.',
            description: 'La opción predilecta para condominios modernos y torres residenciales.',
            price_bob: 350,
            price_usd: 50,
            billing_period: 'MONTHLY',
            max_units: 120,
            max_residents: 500,
            features: [
              'Hasta 120 unidades o departamentos',
              'Todo lo incluido en el Plan Esencial',
              'Reconocimiento Facial biométrico en garita',
              'Notificaciones push automáticas a residentes',
              'Gestión y reserva de áreas sociales y canchas',
              'Control de expensas y cobros con Stripe (BOB / USD)',
              'Soporte prioritario y capacitación técnica',
            ],
            is_popular: true,
            is_active: true,
            order: 2,
          },
          {
            id: 3,
            code: 'corporativo',
            name: 'Plan Corporativo',
            tagline: 'Infraestructura de alta capacidad para macro-condominios y multi-torres.',
            description: 'Potencia empresarial sin límites, con soporte 24/7 y multi-garitas en simultáneo.',
            price_bob: 700,
            price_usd: 100,
            billing_period: 'MONTHLY',
            max_units: 500,
            max_residents: 2000,
            features: [
              'Hasta 500 unidades o departamentos',
              'Todo lo incluido en el Plan Profesional',
              'Múltiples garitas y accesos simultáneos',
              'Integración con barreras vehiculares automáticas',
              'Auditoría y trazabilidad forense de seguridad',
              'Exportación contable y reportes ejecutivos',
              'Gerente de cuenta dedicado y SLA 99.9%',
            ],
            is_popular: false,
            is_active: true,
            order: 3,
          },
        ]);
        this.isLoading.set(false);
      },
    });
  }

  toggleBillingPeriod(): void {
    this.isAnnual.update((val) => !val);
  }

  setUnitRange(range: 'small' | 'medium' | 'large'): void {
    this.selectedUnitRange.set(range);
  }

  getPrice(plan: SubscriptionPlan): number {
    const base = Number(plan.price_bob);
    if (this.isAnnual()) {
      return Math.round(base * 0.85); // 15% discount
    }
    return base;
  }

  openOnboarding(plan?: SubscriptionPlan, method: 'TRIAL' | 'STRIPE' = 'TRIAL'): void {
    if (this.isAuthenticated()) {
      void this.router.navigate(['/mi-condominio'], {
        queryParams: plan ? { selectPlanId: plan.id } : undefined,
      });
      return;
    }

    const defaultPlan = plan || this.plans().find((p) => p.is_popular) || this.plans()[0] || null;
    this.selectedPlan.set(defaultPlan);
    this.onboardingForm.patchValue({
      payment_method: method,
      estimated_units: defaultPlan ? defaultPlan.max_units : 40,
    });
    this.stripePaymentCompleted.set(null);
    this.onboardingStep.set(1);
    this.onboardingError.set('');
    this.onboardingSuccess.set('');
    this.showOnboardingModal.set(true);
  }

  closeOnboarding(): void {
    this.showOnboardingModal.set(false);
    this.onboardingError.set('');
    this.onboardingSuccess.set('');
  }

  setStep(step: 1 | 2 | 3): void {
    this.onboardingError.set('');
    if (step === 2) {
      const condoName = this.onboardingForm.get('condominium_name')?.value;
      if (!condoName || condoName.trim().length < 3) {
        this.onboardingError.set('Ingresa un nombre válido para el condominio (mínimo 3 caracteres).');
        return;
      }
    }
    if (step === 3) {
      const adminName = this.onboardingForm.get('admin_name')?.value;
      const adminEmail = this.onboardingForm.get('admin_email');
      const pass = this.onboardingForm.get('admin_password')?.value;
      const passConfirm = this.onboardingForm.get('admin_password_confirm')?.value;

      if (!adminName || adminName.trim().length < 3) {
        this.onboardingError.set('Ingresa el nombre completo del Administrador.');
        return;
      }
      if (!adminEmail?.valid) {
        this.onboardingError.set('Ingresa un correo electrónico válido para la cuenta de Administrador.');
        return;
      }
      if (!pass || pass.length < 8) {
        this.onboardingError.set('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (pass !== passConfirm) {
        this.onboardingError.set('Las contraseñas no coinciden. Verifícalas por favor.');
        return;
      }
    }
    this.onboardingStep.set(step);
  }

  choosePlanForOnboarding(plan: SubscriptionPlan): void {
    this.selectedPlan.set(plan);
  }

  onStripePaymentCompleted(payment: SaaSPayment): void {
    this.stripePaymentCompleted.set(payment);
    this.submitOnboarding();
  }

  submitOnboarding(): void {
    if (this.onboardingSaving()) return;

    const formVal = this.onboardingForm.getRawValue();

    if (!formVal.condominium_name || !formVal.admin_name || !formVal.admin_email || !formVal.admin_password) {
      this.onboardingError.set('Completa los campos obligatorios para activar tu condominio.');
      return;
    }

    if (formVal.admin_password !== formVal.admin_password_confirm) {
      this.onboardingError.set('Las contraseñas no coinciden.');
      return;
    }

    this.onboardingSaving.set(true);
    this.onboardingError.set('');

    const plan = this.selectedPlan();
    const payment = this.stripePaymentCompleted();

    const payload = {
      condominium_name: formVal.condominium_name.trim(),
      condominium_code: formVal.condominium_code?.trim() || undefined,
      estimated_units: Number(formVal.estimated_units) || 20,
      address: formVal.address?.trim() || '',
      phone: formVal.phone?.trim() || '',
      admin_name: formVal.admin_name.trim(),
      admin_document: formVal.admin_document?.trim() || '',
      admin_email: formVal.admin_email.trim().toLowerCase(),
      admin_phone: formVal.admin_phone?.trim() || '',
      admin_password: formVal.admin_password,
      plan_code: plan ? plan.code : 'profesional',
      payment_method: formVal.payment_method as 'TRIAL' | 'STRIPE',
      payment_id: payment ? payment.id : null,
    };

    this.saasService.registerCondominium(payload).subscribe({
      next: async (res) => {
        this.onboardingSaving.set(false);
        this.onboardingSuccess.set(
          '¡Condominio activado exitosamente! Tu cuenta de Administrador está lista. Redirigiendo a tu panel...'
        );

        // Restore auth session with newly generated credentials
        await this.authService.restoreSession();

        setTimeout(() => {
          this.closeOnboarding();
          void this.router.navigate(['/inicio']);
        }, 1200);
      },
      error: (err: any) => {
        this.onboardingSaving.set(false);
        const detail =
          err?.error?.admin_email?.[0] ||
          err?.error?.condominium_name?.[0] ||
          err?.error?.condominium_code?.[0] ||
          err?.error?.message ||
          err?.error?.detail ||
          'No se pudo completar el registro. Verifica los datos e intenta nuevamente.';
        this.onboardingError.set(detail);
      },
    });
  }

  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
