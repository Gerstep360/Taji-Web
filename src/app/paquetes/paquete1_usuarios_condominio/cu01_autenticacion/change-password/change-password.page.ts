import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { apiErrorMessage } from '../../../../core/api-error';
import { AuthApi } from '../../../../core/auth/auth.api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AlertComponent } from '../../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button.component';
import { FieldComponent } from '../../../../shared/ui/field.component';
import { PasswordMeterComponent } from '../../../../shared/ui/password-meter.component';

/**
 * Cambio de contraseña del usuario autenticado.
 *
 * Es la pantalla a la que llega el residente que entró con la contraseña
 * temporal que le envió la administración. El layout la muestra mientras
 * `must_change_password` siga activo, así que no es opcional: es el paso que
 * convierte una clave conocida por el correo en una clave del usuario.
 */
@Component({
  selector: 'taji-change-password-page',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FieldComponent,
    PasswordMeterComponent,
  ],
  template: `
    <section class="password-shell">
      <header class="password-heading">
        <span class="kicker">Protege tu cuenta</span>
        <h2>Define tu contraseña personal</h2>
        <p>
          La administración te envió una contraseña temporal para tu primer ingreso. Elige una
          nueva para que solo tú conozcas tu acceso a Taji.
        </p>
      </header>

      @if (done()) {
        <div class="success-state" role="status">
          <span class="success-icon" aria-hidden="true">✔</span>
          <p>Tu contraseña fue actualizada correctamente.</p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <taji-alert [message]="errorMessage()" />
          <taji-field
            label="Contraseña temporal"
            type="password"
            icon="lock"
            autocomplete="current-password"
            placeholder="La que recibiste por correo"
            formControlName="current_password"
            [error]="fieldError('current_password')"
          />
          <taji-field
            label="Nueva contraseña"
            type="password"
            icon="lock"
            autocomplete="new-password"
            placeholder="Mínimo 10 caracteres"
            formControlName="password"
            [error]="fieldError('password')"
          />
          <taji-password-meter [password]="form.controls.password.value" />
          <taji-field
            label="Repite la nueva contraseña"
            type="password"
            icon="lock"
            autocomplete="new-password"
            placeholder="Repite tu nueva contraseña"
            formControlName="password_confirm"
            [error]="fieldError('password_confirm')"
          />
          <p class="hint">
            Al cambiarla se cerrarán las demás sesiones abiertas con tu cuenta.
          </p>
          <taji-button type="submit" [loading]="loading()" [disabled]="form.invalid">
            Guardar contraseña
          </taji-button>
        </form>
      }
    </section>
  `,
  styles: [
    `
      .password-shell {
        max-width: 30rem;
        margin: 0 auto;
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem;
        background: #fff;
        border: 1px solid #e6ebf5;
        border-radius: 20px;
        box-shadow: 0 10px 20px rgba(15, 23, 42, 0.04);
      }

      .kicker {
        display: inline-block;
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #5a6f8b;
        margin-bottom: 0.25rem;
      }

      h2 {
        margin: 0 0 0.5rem;
        font-size: 1.35rem;
      }

      p {
        margin: 0;
        color: #52627a;
        font-size: 0.88rem;
        line-height: 1.5;
      }

      form {
        display: grid;
        gap: 1rem;
      }

      .hint {
        font-size: 0.76rem;
        color: #66758a;
      }

      .success-state {
        display: grid;
        gap: 0.5rem;
        justify-items: center;
        padding: 1rem 0;
        text-align: center;
      }

      .success-icon {
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #166534;
        font-size: 1.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly done = signal(false);
  readonly errorMessage = signal('');

  submitted = false;

  readonly form = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(10)]],
    password_confirm: ['', Validators.required],
  });

  fieldError(name: 'current_password' | 'password' | 'password_confirm'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) return '';

    if (control.errors['mismatch']) return 'Las contraseñas no coinciden.';
    if (control.errors['minlength']) return 'Usa al menos 10 caracteres.';
    return 'Este campo es obligatorio.';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage.set('');

    const values = this.form.getRawValue();
    if (values.password !== values.password_confirm) {
      // Se marca a mano porque la coincidencia solo puede evaluarse con los dos
      // campos juntos, y aquí ya están leídos.
      this.form.controls.password_confirm.setErrors({ mismatch: true });
      this.form.controls.password_confirm.markAsTouched();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.api
      .changePassword(values.current_password, values.password, values.password_confirm)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.done.set(true);
          this.auth.markPasswordChanged();
          // La sesión sigue siendo válida: se vuelve a la ruta de origen o al
          // inicio sin cerrar la sesión.
          void this.router.navigateByUrl('/');
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }
}
