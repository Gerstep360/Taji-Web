import { Routes } from '@angular/router';

import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'iniciar-sesion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
    title: 'Iniciar sesión | Taji',
  },
  {
    path: 'crear-cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
    title: 'Crear cuenta | Taji',
  },
  {
    path: 'olvide-contrasena',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
    title: 'Recuperar contraseña | Taji',
  },
  {
    path: 'restablecer-contrasena',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
    title: 'Nueva contraseña | Taji',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        title: 'Inicio | Taji',
      },
      {
        path: 'personal',
        canActivate: [permissionGuard('manage_staff')],
        loadComponent: () => import('./features/staff/staff.page').then((m) => m.StaffPage),
        title: 'Personal | Taji',
      },
      {
        path: 'residentes-y-copropietarios',
        canActivate: [permissionGuard('manage_residents')],
        loadComponent: () =>
          import('./features/residents/resident.page').then((m) => m.ResidentPage),
        title: 'Residentes y copropietarios | Taji',
      },
      {
        path: 'roles-y-permisos',
        canActivate: [permissionGuard('manage_roles')],
        loadComponent: () =>
          import('./features/cu2/cu2.page').then((m) => m.Cu2Page),
        title: 'Roles y Permisos | Taji',
      },
      {
        path: 'acceso-denegado',
        loadComponent: () =>
          import('./features/errors/system-error.page').then((m) => m.SystemErrorPage),
        data: {
          code: '403',
          title: 'Acceso denegado',
          message: 'No tienes permisos para acceder a esta sección.',
        },
        title: 'Acceso denegado | Taji',
      },
      {
        path: 'error-servidor',
        loadComponent: () =>
          import('./features/errors/system-error.page').then((m) => m.SystemErrorPage),
        data: {
          code: '500',
          title: 'Algo salió mal',
          message: 'No pudimos completar la operación. Intenta nuevamente más tarde.',
        },
        title: 'Error del servidor | Taji',
      },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/system-error.page').then((m) => m.SystemErrorPage),
    data: {
      code: '404',
      title: 'Página no encontrada',
      message: 'La dirección que ingresaste no corresponde a una página disponible.',
    },
    title: 'Página no encontrada | Taji',
  },
];
