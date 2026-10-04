import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AuthService } from './auth.service';
import { roleOrPermissionGuard } from './auth.guard';

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
});
