import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthShellComponent } from '../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FieldComponent } from '../../../shared/ui/field.component';
import { PasswordMeterComponent } from '../../../shared/ui/password-meter.component';

@Component({
  selector: 'taji-register-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AlertComponent, ButtonComponent, FieldComponent, PasswordMeterComponent],
  template: `
    <taji-auth-shell [wide]="true">
      <div class="auth-heading">
        <span class="kicker">Empieza en minutos</span>
        <h2>Crea tu cuenta</h2>
        <p>Tu cuenta se registrará como Copropietario / Residente.</p>
      </div>
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <taji-alert [message]="errorMessage" />
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
        <taji-button type="submit" [loading]="loading">Crear mi cuenta</taji-button>
      </form>
      <p class="auth-switch">¿Ya tienes una cuenta? <a routerLink="/iniciar-sesion">Inicia sesión</a></p>
    </taji-auth-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({
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

  fieldError(name: 'first_name' | 'last_name' | 'email' | 'phone' | 'password' | 'password_confirm'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) {
      if (name === 'password_confirm' && control.value && control.value !== this.form.controls.password.value) return 'Las contraseñas no coinciden.';
      return '';
    }
    if (typeof control.errors['server'] === 'string') return control.errors['server'];
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
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/iniciar-sesion'], { state: { registered: true } }),
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
