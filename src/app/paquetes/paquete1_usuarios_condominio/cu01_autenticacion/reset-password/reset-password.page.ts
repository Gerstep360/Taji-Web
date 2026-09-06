import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../../core/api-error';
import { AuthApi } from '../../../../core/auth/auth.api';
import { AuthShellComponent } from '../../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button.component';
import { FieldComponent } from '../../../../shared/ui/field.component';
import { PasswordMeterComponent } from '../../../../shared/ui/password-meter.component';

@Component({
  selector: 'taji-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AlertComponent, ButtonComponent, FieldComponent, PasswordMeterComponent],
  template: `
    <taji-auth-shell>
      @if (completed) {
        <div class="success-state">
          <span class="success-icon" aria-hidden="true">?</span>
          <div class="auth-heading"><h2>Contrase�a actualizada</h2><p>{{ message }}</p></div>
          <a class="button-link" routerLink="/iniciar-sesion">Iniciar sesi�n</a>
        </div>
      } @else {
        <div class="auth-heading">
          <span class="kicker">Protege tu cuenta</span>
          <h2>Crea una nueva contrase�a</h2>
          <p>Elige una clave distinta y dif�cil de adivinar.</p>
        </div>
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <taji-alert [message]="errorMessage" />
          <taji-field label="Nueva contrase�a" type="password" icon="lock" autocomplete="new-password" placeholder="M�nimo 10 caracteres" formControlName="password" [error]="fieldError('password')" />
          <taji-password-meter [password]="form.controls.password.value" />
          <taji-field label="Repite la contrase�a" type="password" icon="lock" autocomplete="new-password" placeholder="Repite tu contrase�a" formControlName="password_confirm" [error]="fieldError('password_confirm')" />
          <taji-button type="submit" [loading]="loading" [disabled]="!hasValidLink">Guardar contrase�a</taji-button>
        </form>
      }
    </taji-auth-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  readonly uid = this.route.snapshot.queryParamMap.get('uid') ?? '';
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly hasValidLink = Boolean(this.uid && this.token);
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(10)]],
    password_confirm: ['', Validators.required],
  });
  submitted = false;
  loading = false;
  completed = false;
  message = '';
  errorMessage = this.hasValidLink ? '' : 'El enlace est� incompleto. Solicita uno nuevo.';

  fieldError(name: 'password' | 'password_confirm'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) return '';
    if (control.errors['minlength']) return 'Usa al menos 10 caracteres.';
    if (control.errors['mismatch']) return 'Las contrase�as no coinciden.';
    return 'Este campo es obligatorio.';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.controls.password.value !== this.form.controls.password_confirm.value) this.form.controls.password_confirm.setErrors({ mismatch: true });
    if (!this.hasValidLink || this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const values = this.form.getRawValue();
    this.api.resetPassword(this.uid, this.token, values.password, values.password_confirm).subscribe({
      next: (response) => { this.message = response.message; this.completed = true; this.loading = false; },
      error: (error: unknown) => { this.errorMessage = apiErrorMessage(error); this.loading = false; },
    });
  }
}
