import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

function getUserRoleSlug(user: any): string {
  if (!user || !user.role) return '';
  if (typeof user.role === 'string') return user.role.toLowerCase();
  if (typeof user.role === 'object' && user.role !== null) {
    return (user.role.slug || user.role.name || '').toLowerCase();
  }
  return '';
}

function getUserPermissions(user: any): string[] {
  if (!user || !user.role) return [];
  if (typeof user.role === 'object' && user.role !== null && Array.isArray(user.role.permissions)) {
    return user.role.permissions.map((p: any) =>
      typeof p === 'string' ? p : p?.code || ''
    );
  }
  return [];
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/iniciar-sesion']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).createUrlTree(['/inicio']) : true;
};

export const permissionGuard =
  (permission: string): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const user = auth.user();
    if (!user) return inject(Router).createUrlTree(['/iniciar-sesion']);
    if (user.is_superuser) return true;
    const perms = getUserPermissions(user);
    return perms.includes(permission) ? true : inject(Router).createUrlTree(['/acceso-denegado']);
  };

export const anyPermissionGuard =
  (permissions: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const user = auth.user();
    if (!user) return inject(Router).createUrlTree(['/iniciar-sesion']);
    if (user.is_superuser) return true;
    const perms = getUserPermissions(user);
    const allowed = permissions.some((p) => perms.includes(p));
    return allowed ? true : inject(Router).createUrlTree(['/acceso-denegado']);
  };

export const roleOrPermissionGuard =
  (roles: string[], permissions: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const user = auth.user();
    if (!user) return inject(Router).createUrlTree(['/iniciar-sesion']);
    if (user.is_superuser) return true;

    const userRoleSlug = getUserRoleSlug(user);
    const hasRole = roles.some((r) => r.toLowerCase() === userRoleSlug);
    if (hasRole) return true;

    const perms = getUserPermissions(user);
    const hasPermission = permissions.some((p) => perms.includes(p));
    return hasPermission ? true : inject(Router).createUrlTree(['/acceso-denegado']);
  };

