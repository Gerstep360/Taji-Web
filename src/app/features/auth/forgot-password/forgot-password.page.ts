import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api-error';
import { AuthApi } from '../../../core/auth/auth.api';
import { AuthShellComponent } from '../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FieldComponent } from '../../../shared/ui/field.component';

@Component({
  selector: 'taji-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AlertComponent, ButtonComponent, FieldComponent],
  template: `
    <taji-auth-shell>
      @if (sent) {
        <div class="success-state">
          <span class="success-icon" aria-hidden="true">✓</span>
          <div class="auth-heading"><h2>Revisa tu correo</h2><p>{{ message }}</p></div>
          <a class="button-link" routerLink="/iniciar-sesion">Volver a iniciar sesión</a>
        </div>
      } @else {
        <div class="auth-heading">
          <span class="kicker">Recupera tu acceso</span>
          <h2>¿Olvidaste tu contraseña?</h2>
          <p>Escribe tu correo y te enviaremos un enlace seguro.</p>
        </div>
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <taji-alert [message]="errorMessage" />
          <taji-field label="Correo electrónico" type="email" icon="mail" placeholder="tu@correo.com" autocomplete="email" formControlName="email" [error]="fieldError" />
          <taji-button type="submit" [loading]="loading">Enviar enlace</taji-button>
        </form>
        <p class="auth-switch"><a routerLink="/iniciar-sesion">← Volver a iniciar sesión</a></p>
      }
    </taji-auth-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  submitted = false;
  loading = false;
  sent = false;
  message = '';
  errorMessage = '';

  get fieldError(): string {
    const control = this.form.controls.email;
    if (!(control.touched || this.submitted) || !control.errors) return '';
    return control.errors['required'] ? 'Ingresa tu correo.' : 'Ingresa un correo válido.';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.api.forgotPassword(this.form.controls.email.value).subscribe({
      next: (response) => { this.message = response.message; this.sent = true; this.loading = false; },
      error: (error: unknown) => { this.errorMessage = apiErrorMessage(error); this.loading = false; },
    });
  }
}
