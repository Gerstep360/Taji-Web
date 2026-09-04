import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { LogoComponent } from '../ui/logo.component';

@Component({
  selector: 'taji-main-layout',
  imports: [LogoComponent, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <aside>
        <taji-logo />
        <nav aria-label="Navegación principal">
          <a routerLink="/inicio" routerLinkActive="active"><span>⌂</span> Inicio</a>
          @if (canManageResidents()) {
            <a routerLink="/residentes-y-copropietarios" routerLinkActive="active"
              ><span aria-hidden="true">⌘</span> Residentes y copropietarios</a
            >
          }
          @if (canManageStaff()) {
            <a routerLink="/personal" routerLinkActive="active"
              ><span aria-hidden="true">♙</span> Personal</a
            >
          }
          @if (canManageRoles()) {
            <a routerLink="/roles-y-permisos" routerLinkActive="active"
              ><span aria-hidden="true">⚙</span> Roles y Permisos</a
            >
          }
          @for (item of pendingModules; track item) {
            <span class="disabled" aria-disabled="true"
              ><span>·</span> {{ item }} <small>Pronto</small></span
            >
          }
        </nav>
        <div class="aside-bottom">
          <button type="button" (click)="logout()"><span>↪</span> Cerrar sesión</button>
          <div class="mini-profile">
            <span>{{ initials }}</span>
            <div>
              <b>{{ user()?.full_name }}</b
              ><small>{{
                user()?.role?.name || (user()?.is_superuser ? 'Superadministrador' : 'Sin rol')
              }}</small>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <header class="topbar">
          <div>
            <span class="eyebrow">Panel personal</span>
            <h1>Hola, {{ user()?.first_name }} <span aria-hidden="true">👋</span></h1>
          </div>
          <span class="avatar" aria-label="Perfil">{{ initials }}</span>
        </header>
        <router-outlet />
      </main>
    </div>
  `,
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user = this.auth.user;
  readonly canManageStaff = computed(() =>
    Boolean(this.user()?.is_superuser || this.user()?.role?.permissions.includes('manage_staff')),
  );
  readonly canManageResidents = computed(() =>
    Boolean(
      this.user()?.is_superuser || this.user()?.role?.permissions.includes('manage_residents'),
    ),
  );
  readonly canManageRoles = computed(() =>
    Boolean(this.user()?.is_superuser || this.user()?.role?.permissions.includes('manage_roles')),
  );
  readonly pendingModules = ['Visitas', 'Incidencias', 'Reservas', 'Comunicados'];

  get initials(): string {
    const current = this.user();
    return (
      `${current?.first_name?.[0] ?? ''}${current?.last_name?.[0] ?? ''}`.toUpperCase() || 'TJ'
    );
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/iniciar-sesion'),
      error: () => {
        this.auth.clearSession();
        void this.router.navigateByUrl('/iniciar-sesion');
      },
    });
  }
}
