import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AuthService } from './auth.service';
import { roleOrPermissionGuard } from './auth.guard';
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
});
