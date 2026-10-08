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

/**
 * Solo para administradores globales de la plataforma.
 *
 * No se puede resolver con `permissionGuard`, porque ese concede el paso a
 * cualquier superusuario **y** a cualquiera con el permiso indicado: un
 * administrador de condominio normal tambien tiene `manage_settings`.
 */
export const superuserGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  if (!user) return inject(Router).createUrlTree(['/iniciar-sesion']);
  return user.is_superuser ? true : inject(Router).createUrlTree(['/acceso-denegado']);
};

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/iniciar-sesion']);

  // Mientras la cuenta use la contraseña temporal enviada por la
  // administración no se permite navegar: hay que definir la clave personal
  // primero. Se excluye la propia pantalla del cambio, o quedaría atrapado.
  if (auth.user()?.must_change_password && route.url[0]?.path !== 'cambiar-contrasena') {
    return router.createUrlTree(['/cambiar-contrasena']);
  }

  return true;
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

