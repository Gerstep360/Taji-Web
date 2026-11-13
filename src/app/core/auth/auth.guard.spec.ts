import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AuthService } from './auth.service';
import { roleOrPermissionGuard, superuserGuard } from './auth.guard';
import { routes } from '../../app.routes';
import { MainLayoutComponent } from '../../shared/layout/main-layout.component';

describe('roleOrPermissionGuard', () => {
  let authServiceMock: {
    user: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      user: vi.fn(),
      isAuthenticated: vi.fn(),
    };

    routerMock = {
      createUrlTree: vi.fn((url: string[]) => ({ url: url.join('/') })),
    };
    Object.assign(routerMock, { events: of() });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('allows access if user has string role "seguridad"', () => {
    authServiceMock.user.mockReturnValue({
      id: 1,
      email: 'guardia@taji.com',
      is_superuser: false,
      role: 'seguridad',
    });

    const guard = roleOrPermissionGuard(['seguridad', 'guardia'], ['shift_execution']);
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('allows access if user has object role with slug "seguridad"', () => {
    authServiceMock.user.mockReturnValue({
      id: 1,
      email: 'guardia@taji.com',
      is_superuser: false,
      role: { slug: 'seguridad', name: 'Seguridad', permissions: [] },
    });

    const guard = roleOrPermissionGuard(['seguridad', 'guardia'], ['shift_execution']);
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('allows access if user has object role with name "Seguridad"', () => {
    authServiceMock.user.mockReturnValue({
      id: 1,
      email: 'guardia@taji.com',
      is_superuser: false,
      role: { name: 'Seguridad', permissions: [] },
    });

    const guard = roleOrPermissionGuard(['seguridad', 'guardia'], ['shift_execution']);
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('denies access if user has role "residente"', () => {
    authServiceMock.user.mockReturnValue({
      id: 2,
      email: 'residente@taji.com',
      is_superuser: false,
      role: { slug: 'residente', name: 'Residente', permissions: [] },
    });

    const guard = roleOrPermissionGuard(['seguridad', 'guardia'], ['shift_execution']);
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toEqual({ url: '/acceso-denegado' });
  });

  it('allows access if user is superuser regardless of role', () => {
    authServiceMock.user.mockReturnValue({
      id: 3,
      email: 'admin@taji.com',
      is_superuser: true,
      role: null,
    });

    const guard = roleOrPermissionGuard(['seguridad', 'guardia'], ['shift_execution']);
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it.each(['admin', 'administrador', 'directiva', 'directorio', 'seguridad', 'guardia', 'security'])(
    'shows CU13 in the menu and allows its actual route for role %s without extra permissions',
    (slug) => {
      authServiceMock.user.mockReturnValue({
        is_superuser: false,
        role: { slug, permissions: [] },
      });

      const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());
      const item = layout.packages.flatMap((pkg) => pkg.items)
        .find((entry) => entry.route === '/turnos-seguridad')!;
      const route = routes.flatMap((entry) => entry.children ?? [])
        .find((entry) => entry.path === 'turnos-seguridad')!;
      const guard = route.canActivate![0] as ReturnType<typeof roleOrPermissionGuard>;

      expect(layout.canAccess(item)).toBe(true);
      expect(TestBed.runInInjectionContext(() => guard({} as any, {} as any))).toBe(true);
    },
  );

  it('hides CU13 and denies its actual route for a resident without shift permissions', () => {
    authServiceMock.user.mockReturnValue({
      is_superuser: false,
      role: { slug: 'residente', permissions: [] },
    });

    const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());
    const item = layout.packages.flatMap((pkg) => pkg.items)
      .find((entry) => entry.route === '/turnos-seguridad')!;
    const route = routes.flatMap((entry) => entry.children ?? [])
      .find((entry) => entry.path === 'turnos-seguridad')!;
    const guard = route.canActivate![0] as ReturnType<typeof roleOrPermissionGuard>;

    expect(layout.canAccess(item)).toBe(false);
    expect(TestBed.runInInjectionContext(() => guard({} as any, {} as any)))
      .toEqual({ url: '/acceso-denegado' });
  });
  it.each(['admin', 'administrador', 'seguridad', 'residente', 'directiva'])(
    'restricts the report menu and actual route to administrators: %s', (slug) => {
      authServiceMock.user.mockReturnValue({ is_superuser: false, role: { slug, permissions: ['view_reports'] } });
      const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());
      const item = layout.packages.flatMap(pkg => pkg.items).find(entry => entry.route === '/reportes-personalizables')!;
      const route = routes.flatMap(entry => entry.children ?? []).find(entry => entry.path === 'reportes-personalizables')!;
      const guard = route.canActivate![0] as ReturnType<typeof roleOrPermissionGuard>;
      const allowed = ['admin', 'administrador'].includes(slug);
      expect(layout.canAccess(item)).toBe(allowed);
      expect(TestBed.runInInjectionContext(() => guard({} as any, {} as any)))
        .toEqual(allowed ? true : { url: '/acceso-denegado' });
    },
  );
});

describe('superuserGuard (consola global de la plataforma)', () => {
  let authServiceMock: {
    user: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  const runGuard = () => TestBed.runInInjectionContext(() => superuserGuard({} as any, {} as any));

  beforeEach(() => {
    authServiceMock = { user: vi.fn(), isAuthenticated: vi.fn() };
    routerMock = { createUrlTree: vi.fn((url: string[]) => ({ url: url.join('/') })) };
    Object.assign(routerMock, { events: of() });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('lets a superuser into the platform console', () => {
    authServiceMock.user.mockReturnValue({ is_superuser: true, role: null });

    expect(runGuard()).toBe(true);
  });

  it('denies a tenant administrator even with manage_settings', () => {
    // El motivo de existir este guard: `manage_settings` lo tiene todo admin de
    // condominio, asi que un `permissionGuard` abriria la consola global.
    authServiceMock.user.mockReturnValue({
      is_superuser: false,
      role: { slug: 'administrador', permissions: ['manage_settings'] },
    });

    expect(runGuard()).toEqual({ url: '/acceso-denegado' });
  });

  it('sends an anonymous visitor to the login page', () => {
    authServiceMock.user.mockReturnValue(null);

    expect(runGuard()).toEqual({ url: '/iniciar-sesion' });
  });

  it('hides the menu entry from non-superusers', () => {
    authServiceMock.user.mockReturnValue({
      is_superuser: false,
      role: { slug: 'administrador', permissions: ['manage_settings'] },
    });

    const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());
    const item = layout.packages.flatMap((pkg) => pkg.items)
      .find((entry) => entry.route === '/plataforma/condominios')!;

    expect(item).toBeDefined();
    expect(layout.canAccess(item)).toBe(false);
  });

  it('shows the menu entry to a superuser', () => {
    authServiceMock.user.mockReturnValue({ is_superuser: true, role: null });

    const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());
    const item = layout.packages.flatMap((pkg) => pkg.items)
      .find((entry) => entry.route === '/plataforma/condominios')!;

    expect(layout.canAccess(item)).toBe(true);
  });

  it('hides the whole Plataforma section from non-superusers', () => {
    // Si solo se ocultara el enlace, el usuario vería un desplegable vacío.
    authServiceMock.user.mockReturnValue({
      is_superuser: false,
      role: { slug: 'administrador', permissions: ['manage_settings'] },
    });

    const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());

    expect(layout.visiblePackages().map((pkg) => pkg.id)).not.toContain('plataforma');
  });

  it('shows the Plataforma section to a superuser', () => {
    authServiceMock.user.mockReturnValue({ is_superuser: true, role: null });

    const layout = TestBed.runInInjectionContext(() => new MainLayoutComponent());

    expect(layout.visiblePackages().map((pkg) => pkg.id)).toContain('plataforma');
  });

  it('protects the route with superuserGuard, not a permission guard', () => {
    const route = routes.flatMap((entry) => entry.children ?? [])
      .find((entry) => entry.path === 'plataforma/condominios')!;

    expect(route).toBeDefined();
    expect(route.canActivate![0]).toBe(superuserGuard);
  });
});
