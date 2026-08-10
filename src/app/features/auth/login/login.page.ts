import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthShellComponent } from '../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FieldComponent } from '../../../shared/ui/field.component';

@Component({
  selector: 'taji-login-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AlertComponent, ButtonComponent, FieldComponent],
  template: `
    <taji-auth-shell>
      <div class="auth-heading">
        <span class="kicker">Bienvenido de vuelta</span>
        <h2>Inicia sesión en Taji</h2>
        <p>Accede a tu comunidad con tus credenciales.</p>
      </div>
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <taji-alert [message]="errorMessage" />
        <taji-field label="Correo electrónico" type="email" icon="mail" placeholder="tu@correo.com" autocomplete="email" formControlName="email" [error]="fieldError('email')" />
        <div>
          <taji-field label="Contraseña" type="password" icon="lock" placeholder="Tu contraseña" autocomplete="current-password" formControlName="password" [error]="fieldError('password')" />
          <div class="form-action"><a routerLink="/olvide-contrasena">¿Olvidaste tu contraseña?</a></div>
        </div>
        <taji-button type="submit" [loading]="loading">Ingresar a Taji</taji-button>
      </form>
      <p class="auth-switch">¿Aún no tienes cuenta? <a routerLink="/crear-cuenta">Crear cuenta</a></p>
    </taji-auth-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  loading = false;
  submitted = false;
  errorMessage = '';

  fieldError(name: 'email' | 'password'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) return '';
    if (control.errors['required']) return name === 'email' ? 'Ingresa tu correo.' : 'Ingresa tu contraseña.';
    return 'Ingresa un correo válido.';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/inicio'),
      error: (error: unknown) => { this.errorMessage = apiErrorMessage(error, 'Correo o contraseña incorrectos.'); this.loading = false; },
    });
  }
}
