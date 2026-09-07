import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthShellComponent } from '../../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button.component';
import { FieldComponent } from '../../../../shared/ui/field.component';

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
        @if (pendingMessage) {
          <div class="pending-notice" role="status">
            <span aria-hidden="true">⏳</span>
            <span>{{ pendingMessage }}</span>
          </div>
        }
        <taji-alert [message]="errorMessage" />
        <taji-field label="Correo electrónico" type="email" icon="mail" placeholder="tu@correo.com" autocomplete="email" formControlName="email" [error]="fieldError('email')" />
        <div>
          <taji-field label="Contraseña" type="password" icon="lock" placeholder="Tu contraseña" autocomplete="current-password" formControlName="password" [error]="fieldError('password')" />
          <div class="form-action"><a routerLink="/olvide-contrasena">¿Olvidaste tu contraseña?</a></div>
        </div>
        <taji-button type="submit" [loading]="loading">Ingresar a Taji</taji-button>
      </form>
      <p class="auth-switch">¿Aún no tienes cuenta? <a routerLink="/crear-cuenta">Crear cuenta</a></p>

      <div class="apk-download-box">
        <a href="https://github.com/Gerstep360/Taji-Movil/releases/download/v1.0/taji-v1.0.apk" target="_blank" rel="noopener noreferrer" class="apk-download-btn" title="Descargar APK para Android">
          <span class="apk-icon" aria-hidden="true">📱</span>
          <div class="apk-text">
            <strong>Descargar App Móvil</strong>
            <small>Android APK v1.0 • Servidor Taji Conectado</small>
          </div>
          <span class="apk-arrow" aria-hidden="true">⬇</span>
        </a>
      </div>
    </taji-auth-shell>
  `,
  styles: [`
    .pending-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      border-radius: 0.75rem;
      background: #fef9e7;
      color: #7d5800;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.5;
      border: 1px solid #f5e0a0;
    }
    .apk-download-box {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }
    .apk-download-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.9rem;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 0.75rem;
      text-decoration: none;
      color: #166534;
      transition: all 0.2s ease;
    }
    .apk-download-btn:hover {
      background: #dcfce7;
      border-color: #4ade80;
      transform: translateY(-1px);
    }
    .apk-icon {
      font-size: 1.3rem;
    }
    .apk-text {
      display: flex;
      flex-direction: column;
      flex: 1;
      text-align: left;
    }
    .apk-text strong {
      font-size: 0.82rem;
      font-weight: 700;
      color: #14532d;
    }
    .apk-text small {
      font-size: 0.70rem;
      color: #15803d;
    }
    .apk-arrow {
      font-size: 1rem;
      font-weight: bold;
      color: #15803d;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  loading = false;
  submitted = false;
  errorMessage = '';
  pendingMessage = '';

  constructor() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['pendingApproval']) {
      this.pendingMessage = 'Tu cuenta fue creada. Un Administrador revisará tu solicitud y te notificará cuando esté aprobada.';
    }
  }

  fieldError(name: 'email' | 'password'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) return '';
    if (control.errors['required']) return name === 'email' ? 'Ingresa tu correo.' : 'Ingresa tu contraseña.';
    return 'Ingresa un correo válido.';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.pendingMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (response) => {
        if (!response.user.is_approved) {
          this.auth.clearSession();
          this.pendingMessage = 'Tu cuenta aún está pendiente de aprobación. Contacta al Administrador.';
          this.loading = false;
          this.changeDetector.markForCheck();
          return;
        }
        void this.router.navigateByUrl('/inicio');
      },
      error: (error: unknown) => {
        this.errorMessage = apiErrorMessage(error, 'Correo o contraseña incorrectos.');
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
