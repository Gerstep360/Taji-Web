import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../ui/icon.component';
import { LogoComponent } from '../ui/logo.component';

interface SubNavItem {
  label: string;
  icon: string;
  route?: string;
  permission?: string;
  isAvailable: boolean;
}

interface PackageDropdown {
  id: string;
  title: string;
  icon: string;
  items: SubNavItem[];
}

@Component({
  selector: 'taji-main-layout',
  imports: [LogoComponent, IconComponent, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      @if (isMobileMenuOpen()) {
        <div class="sidebar-backdrop" (click)="closeMobileMenu()" aria-hidden="true"></div>
      }

      <aside [class.is-mobile-open]="isMobileMenuOpen()">
        <div class="aside-header">
          <taji-logo />
          <button
            type="button"
            class="btn-close-drawer"
            (click)="closeMobileMenu()"
            aria-label="Cerrar menú"
          >
            <taji-icon name="x" [size]="18" />
          </button>
        </div>

        <nav aria-label="Navegación principal">
          <!-- Inicio directo -->
          <a routerLink="/inicio" routerLinkActive="active" class="nav-direct" (click)="closeMobileMenu()">
            <taji-icon name="home" [size]="18" />
            <span>Inicio</span>
          </a>

          <!-- Dropdowns por Paquete -->
          <div class="packages-list">
            @for (pkg of packages; track pkg.id) {
              <div class="package-accordion" [class.is-expanded]="isExpanded(pkg.id)">
                <button
                  type="button"
                  class="package-trigger"
                  (click)="togglePackage(pkg.id)"
                  [attr.aria-expanded]="isExpanded(pkg.id)"
                >
                  <taji-icon [name]="pkg.icon" [size]="18" class="pkg-icon" />
                  <span class="pkg-title">{{ pkg.title }}</span>
                  @if (getActiveCount(pkg) > 0) {
                    <span class="active-badge">{{ getActiveCount(pkg) }}</span>
                  }
                  <taji-icon
                    name="chevron-down"
                    [size]="14"
                    class="chevron"
                    [class.rotated]="isExpanded(pkg.id)"
                  />
                </button>

                @if (isExpanded(pkg.id)) {
                  <div class="package-content" role="region">
                    @for (item of pkg.items; track item.label) {
                      @if (item.isAvailable && item.route) {
                        @if (canAccess(item)) {
                          <a
                            [routerLink]="item.route"
                            routerLinkActive="active"
                            class="sub-item"
                            (click)="closeMobileMenu()"
                          >
                            <taji-icon [name]="item.icon" [size]="15" />
                            <span>{{ item.label }}</span>
                          </a>
                        }
                      } @else {
                        <span class="sub-item disabled" aria-disabled="true">
                          <taji-icon [name]="item.icon" [size]="15" />
                          <span>{{ item.label }}</span>
                          <small class="pill-pronto">Pronto</small>
                        </span>
                      }
                    }
                  </div>
                }
              </div>
            }
          </div>
        </nav>

        <div class="aside-bottom">
          <a href="/downloads/taji-1.0.apk" download="taji-v1.0.apk" class="apk-aside-link" title="Descargar APK para Android">
            <taji-icon name="smartphone" [size]="16" />
            <span>App Móvil (APK v1.0)</span>
          </a>
          <button type="button" (click)="logout()">
            <taji-icon name="log-out" [size]="16" />
            <span>Cerrar sesión</span>
          </button>
          <div class="mini-profile">
            <span>{{ initials }}</span>
            <div>
              <b>{{ user()?.full_name || 'Admin Sistema' }}</b>
              <small>{{
                user()?.role?.name || (user()?.is_superuser ? 'Administrador' : 'Sin rol')
              }}</small>
            </div>
          </div>
        </div>
      </aside>

      <main>
        <header class="topbar">
          <div class="topbar-left">
            <button
              type="button"
              class="btn-menu-toggle"
              (click)="toggleMobileMenu()"
              [attr.aria-expanded]="isMobileMenuOpen()"
              aria-label="Abrir menú de navegación"
            >
              <taji-icon name="menu" [size]="20" />
            </button>
            <div class="topbar-titles">
              <span class="eyebrow">Panel personal</span>
              <h1>Hola, {{ user()?.first_name || 'Admin' }}</h1>
            </div>
          </div>
          <div class="topbar-right">
            <span class="avatar" aria-label="Perfil">{{ initials }}</span>
          </div>
        </header>
        <div class="main-content">
          <router-outlet />
        </div>
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
  readonly isMobileMenuOpen = signal<boolean>(false);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  // Estado de acordeón por paquete: Paquete 1 abierto por defecto
  readonly expandedPackages = signal<Record<string, boolean>>({
    paquete1: true,
    paquete2: false,
    paquete3: false,
    paquete4: false,
    paquete5: false,
  });

  readonly packages: PackageDropdown[] = [
    {
      id: 'paquete1',
      title: 'Usuarios y Condominio',
      icon: 'users',
      items: [
        {
          label: 'Roles y Permisos',
          icon: 'shield-check',
          route: '/roles-y-permisos',
          permission: 'manage_roles',
          isAvailable: true,
        },
        {
          label: 'Personal del Condominio',
          icon: 'badge-user',
          route: '/personal',
          permission: 'manage_staff',
          isAvailable: true,
        },
        {
          label: 'Datos del Condominio',
          icon: 'building',
          route: '/condominium/config',
          permission: 'manage_settings',
          isAvailable: true,
        },
        {
          label: 'Sectores y Unidades',
          icon: 'layout-grid',
          route: '/sectores-unidades',
          permission: 'manage_units',
          isAvailable: true,
        },
        {
          label: 'Residentes y Copropietarios',
          icon: 'users',
          route: '/residentes-y-copropietarios',
          permission: 'manage_residents',
          isAvailable: true,
        },
        {
          label: 'Asignación de Unidades',
          icon: 'link',
          route: '/residentes-unidades',
          permission: 'manage_residents',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'paquete2',
      title: 'Seguridad y Accesos',
      icon: 'shield',
      items: [
        {
          label: 'Registro de Visitantes',
          icon: 'user-check',
          isAvailable: false,
        },
        {
          label: 'Pases QR de Visita',
          icon: 'qr-code',
          isAvailable: false,
        },
        {
          label: 'Control de Accesos',
          icon: 'door-open',
          isAvailable: false,
        },
        {
          label: 'Turnos y Novedades',
          icon: 'clock',
          isAvailable: false,
        },
        {
          label: 'Auditoría y Bitácora',
          icon: 'file-text',
          isAvailable: false,
        },
        {
          label: 'Verificación Facial',
          icon: 'scan-face',
          isAvailable: false,
        },
      ],
    },
    {
      id: 'paquete3',
      title: 'Incidencias e IA',
      icon: 'alert-triangle',
      items: [
        {
          label: 'Reportar Incidencia',
          icon: 'alert-triangle',
          isAvailable: false,
        },
        {
          label: 'Seguimiento y Ciclo',
          icon: 'git-branch',
          isAvailable: false,
        },
        {
          label: 'Clasificación con IA',
          icon: 'sparkles',
          isAvailable: false,
        },
      ],
    },
    {
      id: 'paquete4',
      title: 'Activos y Mantenimiento',
      icon: 'boxes',
      items: [
        {
          label: 'Inventario de Activos',
          icon: 'boxes',
          isAvailable: false,
        },
        {
          label: 'Identificación QR',
          icon: 'search',
          isAvailable: false,
        },
        {
          label: 'Órdenes de Trabajo',
          icon: 'wrench',
          isAvailable: false,
        },
      ],
    },
    {
      id: 'paquete5',
      title: 'Servicios y Comunidad',
      icon: 'layers',
      items: [
        {
          label: 'Áreas Comunes y Reservas',
          icon: 'calendar',
          isAvailable: false,
        },
        {
          label: 'Comunicados y Avisos',
          icon: 'bell',
          isAvailable: false,
        },
        {
          label: 'Asambleas y Acuerdos',
          icon: 'landmark',
          isAvailable: false,
        },
        {
          label: 'Dashboard y Reportes',
          icon: 'bar-chart',
          isAvailable: false,
        },
      ],
    },
  ];

  isExpanded(pkgId: string): boolean {
    return Boolean(this.expandedPackages()[pkgId]);
  }

  togglePackage(pkgId: string): void {
    this.expandedPackages.update((prev) => ({
      ...prev,
      [pkgId]: !prev[pkgId],
    }));
  }

  getActiveCount(pkg: PackageDropdown): number {
    return pkg.items.filter((item) => item.isAvailable && this.canAccess(item)).length;
  }

  canAccess(item: SubNavItem): boolean {
    if (!item.isAvailable) return false;
    if (!item.permission) return true;
    const current = this.user();
    return Boolean(
      current?.is_superuser || current?.role?.permissions.includes(item.permission),
    );
  }

  get initials(): string {
    const current = this.user();
    return (
      `${current?.first_name?.[0] ?? ''}${current?.last_name?.[0] ?? ''}`.toUpperCase() || 'AD'
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
