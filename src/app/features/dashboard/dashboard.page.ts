import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'taji-dashboard-page',
  imports: [IconComponent],
  template: `
    <section class="welcome">
      <div>
        <span class="pill">Acceso confirmado</span>
        <h2>Bienvenido a tu comunidad Taji</h2>
        <p>Tu cuenta está lista. Los módulos del condominio se habilitarán en las siguientes etapas.</p>
      </div>
      <div class="welcome-art" aria-hidden="true"><span></span><i></i><b>✓</b></div>
    </section>
    <section class="stats" aria-label="Resumen de cuenta">
      <article>
        <span class="stat-icon blue"><taji-icon name="shield-check" [size]="18" /></span>
        <div><small>Tu rol</small><b>{{ user()?.role?.name ?? (user()?.is_superuser ? 'Administrador' : 'Sin asignar') }}</b></div>
      </article>
      <article>
        <span class="stat-icon green"><taji-icon name="shield" [size]="18" /></span>
        <div><small>Estado de cuenta</small><b>Activa y protegida</b></div>
      </article>
      <article>
        <span class="stat-icon violet"><taji-icon name="sparkles" [size]="18" /></span>
        <div><small>Permisos preparados</small><b>{{ user()?.role?.permissions?.length ?? (user()?.is_superuser ? 33 : 0) }}</b></div>
      </article>
    </section>
    <section class="content-grid">
      <article class="panel">
        <div class="panel-title"><div><span class="eyebrow">Acceso</span><h3>Permisos de tu rol</h3></div><span class="role-badge">{{ user()?.role?.name ?? (user()?.is_superuser ? 'Administrador' : 'Sin rol') }}</span></div>
        <div class="permissions">
          @for (permission of user()?.role?.permissions ?? []; track permission) { <span>{{ permissionLabel(permission) }}</span> }
          @if ((user()?.role?.permissions?.length ?? 0) === 0 && user()?.is_superuser) {
            <span>Acceso total de Administrador del Sistema</span>
          }
        </div>
      </article>
      <article class="panel profile-panel">
        <div class="panel-title"><div><span class="eyebrow">Cuenta</span><h3>Tus datos</h3></div></div>
        <dl><div><dt>Nombre</dt><dd>{{ user()?.full_name }}</dd></div><div><dt>Correo</dt><dd>{{ user()?.email }}</dd></div><div><dt>Teléfono</dt><dd>{{ user()?.phone || 'No registrado' }}</dd></div></dl>
      </article>
    </section>
  `,
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;

  permissionLabel(code: string): string {
    return code.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  }
}
