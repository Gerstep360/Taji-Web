import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../../core/api-error';
import { AuthApi } from '../../../../core/auth/auth.api';
import { AuthShellComponent } from '../../../../shared/layout/auth-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button.component';
import { FieldComponent } from '../../../../shared/ui/field.component';
import { PasswordMeterComponent } from '../../../../shared/ui/password-meter.component';

/**
 * Activación de cuenta y restablecimiento de contraseña.
 *
 * El estado vive en **señales**, no en campos planos, porque la aplicación
 * corre sin `zone.js` (zoneless). En ese modo la respuesta de `HttpClient` no
 * notifica el change detection: con `OnPush` y campos planos el botón se
 * quedaba en "Guardando…" para siempre aunque el backend ya hubiera guardado
 * la contraseña. Al recargar, el token ya estaba consumido y el mensaje
 * passing a ser "el enlace expiró", lo que hacía parecer un fallo intermitente.
 */
@Component({
  selector: 'taji-reset-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    AlertComponent,
    ButtonComponent,
    FieldComponent,
    PasswordMeterComponent,
  ],
  template: `
    <taji-auth-shell>
      @if (completed()) {
        <div class="success-state">
          <span class="success-icon" aria-hidden="true">✔</span>
          <div class="auth-heading">
            <h2>{{ isInvite ? '¡Cuenta activada exitosamente!' : 'Contraseña actualizada' }}</h2>
            <p>
              {{
                isInvite
                  ? 'Tu cuenta ha sido activada y tu contraseña configurada. Ya puedes iniciar sesión con tu correo.'
                  : message()
              }}
            </p>
          </div>
          <a class="button-link" routerLink="/iniciar-sesion">Iniciar sesión</a>
        </div>
      } @else {
        <div class="auth-heading">
          <span class="kicker">{{ isInvite ? 'Bienvenido a tu comunidad' : 'Protege tu cuenta' }}</span>
          <h2>{{ isInvite ? 'Activa tu cuenta de residente' : 'Crea una nueva contraseña' }}</h2>
          <p>
            {{
              isInvite
                ? 'Crea tu clave de acceso personal para ingresar a Taji (Web y App Móvil).'
                : 'Elige una clave distinta y difícil de adivinar.'
            }}
          </p>
        </div>
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <taji-alert [message]="errorMessage()" />
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
            label="Repite la contraseña"
            type="password"
            icon="lock"
            autocomplete="new-password"
            placeholder="Repite tu contraseña"
            formControlName="password_confirm"
            [error]="fieldError('password_confirm')"
          />
          <taji-button type="submit" [loading]="loading()" [disabled]="!hasValidLink || submitting()">
            {{ isInvite ? 'Activar cuenta y guardar contraseña' : 'Guardar contraseña' }}
          </taji-button>
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
  readonly isInvite =
    this.route.snapshot.queryParamMap.get('invite') === '1' ||
    this.route.snapshot.queryParamMap.get('activar') === '1';
  readonly hasValidLink = Boolean(this.uid && this.token);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(10)]],
    password_confirm: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly completed = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal(
    this.hasValidLink ? '' : 'El enlace está incompleto. Solicita uno nuevo a tu administrador.',
  );
  readonly submitted = signal(false);
  /** Evita que un segundo clic dispare otra petición antes del repintado. */
  readonly submitting = signal(false);

  fieldError(name: 'password' | 'password_confirm'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted()) || !control.errors) return '';

    if (control.errors['minlength']) return 'Usa al menos 10 caracteres.';
    if (control.errors['mismatch']) return 'Las contraseñas no coinciden.';
    return 'Este campo es obligatorio.';
  }

  submit(): void {
    // El botón se deshabilita por `[submitting]`, pero ese estado solo llega a
    // la vista tras el ciclo de detección. La guarda síncrona es la que evita
    // de verdad el doble POST dentro del mismo frame.
    if (this.submitting() || this.loading()) return;

    this.submitted.set(true);
    this.errorMessage.set('');

    const values = this.form.getRawValue();
    if (values.password !== values.password_confirm) {
      this.form.controls.password_confirm.setErrors({ mismatch: true });
      this.form.controls.password_confirm.markAsTouched();
      return;
    }

    if (!this.hasValidLink || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.submitting.set(true);

    this.api.resetPassword(this.uid, this.token, values.password, values.password_confirm).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.submitting.set(false);
        this.message.set(response.message);
        this.completed.set(true);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.submitting.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
