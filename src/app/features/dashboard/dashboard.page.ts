import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { LogoComponent } from '../../shared/ui/logo.component';

@Component({
  selector: 'taji-dashboard-page',
  imports: [LogoComponent],
  template: `
    <div class="app-shell">
      <aside>
        <taji-logo />
        <nav aria-label="Navegación principal">
          <a class="active"><span>⌂</span> Inicio</a>
          @for (item of modules; track item) { <span class="disabled"><span>·</span> {{ item }} <small>Pronto</small></span> }
        </nav>
        <div class="aside-bottom">
          <button type="button" (click)="logout()"><span>↪</span> Cerrar sesión</button>
          <div class="mini-profile"><span>{{ initials }}</span><div><b>{{ user()?.full_name }}</b><small>{{ user()?.role?.name }}</small></div></div>
        </div>
      </aside>
      <main>
        <header class="topbar">
          <div><span class="eyebrow">Panel personal</span><h1>Hola, {{ user()?.first_name }} <span aria-hidden="true">👋</span></h1></div>
          <button class="avatar" type="button" aria-label="Perfil">{{ initials }}</button>
        </header>
        <section class="welcome">
          <div>
            <span class="pill">Acceso confirmado</span>
            <h2>Bienvenido a tu comunidad Taji</h2>
            <p>Tu cuenta está lista. Los módulos del condominio se habilitarán en las siguientes etapas.</p>
          </div>
          <div class="welcome-art" aria-hidden="true"><span></span><i></i><b>✓</b></div>
        </section>
        <section class="stats" aria-label="Resumen de cuenta">
          <article><span class="stat-icon blue">♙</span><div><small>Tu rol</small><b>{{ user()?.role?.name ?? 'Sin asignar' }}</b></div></article>
          <article><span class="stat-icon green">✓</span><div><small>Estado de cuenta</small><b>Activa y protegida</b></div></article>
          <article><span class="stat-icon violet">◇</span><div><small>Permisos preparados</small><b>{{ user()?.role?.permissions?.length ?? 0 }}</b></div></article>
        </section>
        <section class="content-grid">
          <article class="panel">
            <div class="panel-title"><div><span class="eyebrow">Acceso</span><h3>Permisos de tu rol</h3></div><span class="role-badge">{{ user()?.role?.name }}</span></div>
            <div class="permissions">
              @for (permission of user()?.role?.permissions ?? []; track permission) { <span>{{ permissionLabel(permission) }}</span> }
            </div>
          </article>
          <article class="panel profile-panel">
            <div class="panel-title"><div><span class="eyebrow">Cuenta</span><h3>Tus datos</h3></div></div>
            <dl><div><dt>Nombre</dt><dd>{{ user()?.full_name }}</dd></div><div><dt>Correo</dt><dd>{{ user()?.email }}</dd></div><div><dt>Teléfono</dt><dd>{{ user()?.phone || 'No registrado' }}</dd></div></dl>
          </article>
        </section>
      </main>
    </div>
  `,
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user = this.auth.user;
  readonly modules = ['Visitas', 'Incidencias', 'Reservas', 'Comunicados'];

  get initials(): string {
    const current = this.user();
    return `${current?.first_name?.[0] ?? ''}${current?.last_name?.[0] ?? ''}`.toUpperCase() || 'TJ';
  }

  permissionLabel(code: string): string {
    return code.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/iniciar-sesion'),
      error: () => { this.auth.clearSession(); void this.router.navigateByUrl('/iniciar-sesion'); },
    });
  }
}
