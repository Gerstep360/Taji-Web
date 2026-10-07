import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage, apiFieldErrors } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth/auth.service';
import { SaasService } from '../../../../core/saas/saas.service';
import { AuthShellComponent } from '../../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button.component';
import { FieldComponent } from '../../../../shared/ui/field.component';
import { PasswordMeterComponent } from '../../../../shared/ui/password-meter.component';

@Component({
  selector: 'taji-register-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AlertComponent, ButtonComponent, FieldComponent, PasswordMeterComponent],
  template: `
    <taji-auth-shell [wide]="true">
      <div class="auth-heading">
        <span class="kicker">Empieza en minutos</span>
        <h2>Crea tu cuenta de Residente</h2>
        <p>Selecciona tu condominio para que tu administración apruebe tu acceso.</p>
      </div>
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <taji-alert [message]="errorMessage" />

        <div class="form-grid">
          <div class="field-wrap">
            <label for="regCondo" class="field-label">Condominio donde resides *</label>
            <div class="select-container">
              <select id="regCondo" formControlName="condominium_id" class="condo-select">
                <option [ngValue]="null">-- Selecciona tu Condominio --</option>
                @for (c of condominiums(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }} ({{ c.address || c.slug }})</option>
                }
              </select>
            </div>
            @if (fieldError('condominium_id')) {
              <span class="field-error">{{ fieldError('condominium_id') }}</span>
            }
          </div>

          <taji-field
            label="Unidad / Departamento que habitas"
            icon="building"
            placeholder="Ej. Torre A - Depto 302"
            formControlName="unit_label"
            [error]="fieldError('unit_label')"
          />
        </div>

        <div class="form-grid">
          <taji-field label="Nombres" icon="user" placeholder="Tus nombres" autocomplete="given-name" formControlName="first_name" [error]="fieldError('first_name')" />
          <taji-field label="Apellidos" icon="user" placeholder="Tus apellidos" autocomplete="family-name" formControlName="last_name" [error]="fieldError('last_name')" />
        </div>
        <div class="form-grid">
          <taji-field label="Correo electrónico" type="email" icon="mail" placeholder="tu@correo.com" autocomplete="email" formControlName="email" [error]="fieldError('email')" />
          <taji-field label="Teléfono (opcional)" type="tel" icon="phone" placeholder="+591 70000000" autocomplete="tel" formControlName="phone" [error]="fieldError('phone')" />
        </div>
        <div class="form-grid">
          <taji-field label="Contraseña" type="password" icon="lock" placeholder="Mínimo 10 caracteres" autocomplete="new-password" formControlName="password" [error]="fieldError('password')" />
          <taji-field label="Repite la contraseña" type="password" icon="lock" placeholder="Repite tu contraseña" autocomplete="new-password" formControlName="password_confirm" [error]="fieldError('password_confirm')" />
        </div>
        <taji-password-meter [password]="form.controls.password.value" />
        <taji-button type="submit" [loading]="loading">Crear mi cuenta de Residente</taji-button>
      </form>
      <p class="auth-switch">¿Ya tienes una cuenta? <a routerLink="/iniciar-sesion">Inicia sesión</a></p>

      <div class="saas-admin-callout">
        <div class="callout-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <line x1="9" y1="6" x2="9.01" y2="6"/>
            <line x1="15" y1="6" x2="15.01" y2="6"/>
          </svg>
        </div>
        <div class="callout-text">
          <span>¿Deseas registrar un <strong>nuevo Condominio</strong> como Administrador?</span>
          <a routerLink="/welcome">Comienza tu registro en Taji SaaS (14 días gratis)</a>
        </div>
      </div>
    </taji-auth-shell>
  `,
  styles: [`
    .field-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .field-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--taji-ink, #10233c);
    }
    .select-container {
      position: relative;
    }
    .condo-select {
      width: 100%;
      min-height: 3.1rem;
      padding: 0.65rem 0.95rem;
      border: 1px solid var(--taji-border, #dce4ed);
      border-radius: 0.85rem;
      background: #ffffff;
      color: var(--taji-ink, #10233c);
      font-size: 0.88rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;

      &:focus {
        border-color: var(--taji-primary, #0f6fff);
        box-shadow: 0 0 0 3px var(--taji-focus, rgba(15, 111, 255, 0.17));
      }
    }
    .field-error {
      color: #dc2626;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .saas-admin-callout {
      margin-top: 1.25rem;
      padding: 0.85rem 1rem;
      border-radius: 0.85rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.78rem;
      color: #1e3a8a;
    }
    .callout-icon {
      flex-shrink: 0;
    }
    .callout-text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .callout-text a {
      color: #2563eb;
      font-weight: 700;
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly saas = inject(SaasService);
  private readonly router = inject(Router);

  readonly condominiums = signal<Array<{ id: number; name: string; slug: string; address: string }>>([]);

  readonly form = this.fb.nonNullable.group({
    condominium_id: [null as number | null, Validators.required],
    unit_label: ['', [Validators.required, Validators.minLength(2)]],
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.pattern(/^\+?[0-9 ()-]{7,25}$/)],
    password: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/^(?!\d+$).+$/)]],
    password_confirm: ['', Validators.required],
  });
  loading = false;
  submitted = false;
  errorMessage = '';

  ngOnInit(): void {
    this.saas.getPublicCondominiums().subscribe({
      next: (list) => this.condominiums.set(list),
      error: () => {},
    });
  }

  fieldError(name: 'first_name' | 'last_name' | 'email' | 'phone' | 'password' | 'password_confirm' | 'condominium_id' | 'unit_label'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) {
      if (name === 'password_confirm' && control.value && control.value !== this.form.controls.password.value) return 'Las contraseñas no coinciden.';
      return '';
    }
    if (typeof control.errors['server'] === 'string') return control.errors['server'];
    if (control.errors['required']) {
      if (name === 'condominium_id') return 'Selecciona tu condominio de residencia.';
      if (name === 'unit_label') return 'Ingresa tu unidad o departamento.';
    }
    if (control.errors['email']) return 'Ingresa un correo válido.';
    if (control.errors['minlength']) return name === 'password' ? 'Usa al menos 10 caracteres.' : 'Usa al menos 2 caracteres.';
    if (control.errors['pattern']) {
      if (name === 'phone') return 'Usa entre 7 y 25 números; puedes incluir +, espacios, guiones o paréntesis.';
      if (name === 'password') return 'La contraseña no puede contener solamente números.';
    }
    return 'Este campo es obligatorio.';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.controls.password.value !== this.form.controls.password_confirm.value) { this.form.controls.password_confirm.setErrors({ mismatch: true }); }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const formVal = this.form.getRawValue();
    const phone = formVal.phone.trim();

    const request = {
      ...formVal,
      phone: phone || undefined,
    };

    this.auth.register(request).subscribe({
      next: () => void this.router.navigate(['/iniciar-sesion'], { state: { pendingApproval: true } }),
      error: (error: unknown) => {
        this.applyServerErrors(error);
        this.errorMessage = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  private applyServerErrors(error: unknown): void {
    for (const [name, message] of Object.entries(apiFieldErrors(error))) {
      if (!(name in this.form.controls)) continue;
      const control = this.form.controls[name as keyof typeof this.form.controls];
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    }
  }
}
