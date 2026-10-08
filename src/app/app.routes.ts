import { Routes } from '@angular/router';

import { anyPermissionGuard, authGuard, guestGuard, permissionGuard, roleOrPermissionGuard } from './core/auth/auth.guard';


export const routes: Routes = [
  {
    path: 'welcome',
    loadComponent: () =>
      import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
    title: 'Taji SaaS | Planes, Precios y Seguridad Inteligente',
  },
  {
    path: 'bienvenida',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'iniciar-sesion',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./paquetes/paquete1_usuarios_condominio/cu01_autenticacion').then((m) => m.LoginPage),
    title: 'Iniciar sesión | Taji',
  },
  {
    path: 'crear-cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./paquetes/paquete1_usuarios_condominio/cu01_autenticacion').then((m) => m.RegisterPage),
    title: 'Crear cuenta | Taji',
  },
  {
    path: 'olvide-contrasena',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./paquetes/paquete1_usuarios_condominio/cu01_autenticacion').then(
        (m) => m.ForgotPasswordPage,
      ),
    title: 'Recuperar contraseña | Taji',
  },
  {
    path: 'restablecer-contrasena',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./paquetes/paquete1_usuarios_condominio/cu01_autenticacion').then((m) => m.ResetPasswordPage),
    title: 'Nueva contraseña | Taji',
  },
  {
    path: 'activar-cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./paquetes/paquete1_usuarios_condominio/cu01_autenticacion').then((m) => m.ResetPasswordPage),
    title: 'Activar cuenta | Taji',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'reportes-personalizables',
        canActivate: [roleOrPermissionGuard(['admin', 'administrador', 'superadmin'], [])],
        loadComponent: () => import('./paquetes/paquete5_servicios_comunidad/reportes/reportes.page').then(m => m.ReportsPage),
        title: 'Reportes personalizables | Taji',
      },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./paquetes/paquete5_servicios_comunidad/cu30_dashboard_reportes/dashboard.page').then((m) => m.DashboardPage),
        title: 'Inicio | Taji',
      },
      {
        path: 'personal',
        canActivate: [permissionGuard('manage_staff')],
        loadComponent: () =>
          import('./paquetes/paquete1_usuarios_condominio/cu07_personal').then((m) => m.StaffPage),
        title: 'Personal | Taji',
      },
      {
        path: 'residentes-y-copropietarios',
        canActivate: [permissionGuard('manage_residents')],
        loadComponent: () =>
          import('./paquetes/paquete1_usuarios_condominio/cu05_residentes/resident.page').then((m) => m.ResidentPage),
        title: 'Residentes y copropietarios | Taji',
      },
      {
        path: 'roles-y-permisos',
        canActivate: [permissionGuard('manage_roles')],
        loadComponent: () =>
          import('./paquetes/paquete1_usuarios_condominio/cu02_roles_permisos').then((m) => m.Cu2Page),
        title: 'Roles y Permisos | Taji',
      },
      {
        path: 'mi-condominio',
        canActivate: [permissionGuard('manage_settings')],
        loadComponent: () =>
          import('./paquetes/paquete1_usuarios_condominio/cu03_datos_condominio/tenant-admin.page').then(
            (m) => m.TenantAdminPage,
          ),
        title: 'Mi Condominio & Suscripción SaaS | Taji',
      },
      {
        path: 'condominium/config',
        redirectTo: 'mi-condominio',
        pathMatch: 'full',
      },
      {
        path: 'sectores-unidades',
        canActivate: [permissionGuard('manage_units')],
        loadComponent: () =>
          import('./paquetes/paquete1_usuarios_condominio/cu04_sectores_unidades').then(
            (m) => m.SectoresUnidadesPage,
          ),
        title: 'Sectores y Unidades | Taji',
      },
      {
        path: 'residentes-unidades',
        canActivate: [permissionGuard('manage_residents')],
        loadComponent: () =>
          import('./paquetes/paquete1_usuarios_condominio/cu06_asociar_residentes_unidades').then(
            (m) => m.ResidentesUnidadesPage,
          ),
        title: 'Asignación de unidades | Taji',
      },
      {
        path: 'auditoria',
        canActivate: [permissionGuard('manage_roles')],
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu16_auditoria_bitacora').then(
            (m) => m.AuditoriaPage,
          ),
        title: 'Auditoría y Bitácora | Taji',
      },
      {
        path: 'verificacion-facial',
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu17_verificacion_facial').then(
            (m) => m.FacialVerificationPage,
          ),
        title: 'Verificación Facial de Residentes | Taji',
      },
      {
        path: 'visitantes',
        canActivate: [anyPermissionGuard(['manage_visits', 'register_visits', 'validate_visits'])],
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu08_visitantes').then(
            (m) => m.VisitantesPage,
          ),
        title: 'Visitantes y Autorizaciones | Taji',
      },
      {
        path: 'pases-qr',
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu09_qr_visita').then(
            (m) => m.PasesQrPage,
          ),
        title: 'Pases QR de Visita | Taji',
      },
      {
        path: 'validar-qr',
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu10_validar_qr').then(
            (m) => m.ControlAccesosPage,
          ),
        title: 'Validación de Accesos QR | Taji',
      },
      {
        path: 'visitas-dentro',
        canActivate: [anyPermissionGuard(['manage_visits', 'register_visits', 'validate_visits', 'register_entry_exit'])],
        loadComponent: () => import('./paquetes/paquete2_seguridad_accesos/cu12_consultar_visitas_dentro/visits.page').then(m => m.VisitConsultationPage),
        title: 'Visitas y personas dentro | Taji',
      },
      {
        path: 'control-accesos',
        canActivate: [permissionGuard('register_entry_exit')],
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu11_control_accesos').then(
            (m) => m.ControlAccesosPage,
          ),
        title: 'Control de Accesos | Taji',
      },
      {
        path: 'turnos-seguridad',
        canActivate: [roleOrPermissionGuard(['admin', 'administrador', 'directiva', 'directorio', 'seguridad', 'guardia', 'security'], ['manage_security_shifts', 'operate_security_shifts', 'view_security_shifts'])],
        loadComponent: () =>
          import('./paquetes/paquete2_seguridad_accesos/cu13_turnos_seguridad').then(
            (m) => m.TurnosPage,
          ),
        title: 'Turnos de Seguridad | Taji',
      },
      {
        path: 'novedades-turno',
        canActivate: [roleOrPermissionGuard(['admin', 'administrador', 'directiva', 'directorio', 'seguridad', 'guardia', 'security'], ['manage_security_shifts', 'operate_security_shifts', 'view_security_shifts'])],
        loadComponent: () => import('./paquetes/paquete2_seguridad_accesos/cu14_novedades_incidentes/novedades.page').then(m => m.NovedadesPage),
        title: 'Novedades de Turno | Taji',
      },
      {
        path: 'entregas-turno',
        canActivate: [roleOrPermissionGuard(['admin', 'administrador', 'directiva', 'directorio', 'seguridad', 'guardia', 'security'], ['manage_security_shifts', 'operate_security_shifts', 'view_security_shifts'])],
        loadComponent: () => import('./paquetes/paquete2_seguridad_accesos/cu15_entrega_turno/entregas.page').then(m => m.EntregasPage),
        title: 'Entrega y Recepción de Turno | Taji',
      },
      {
        path: 'acceso-denegado',
        loadComponent: () =>
          import('./shared/pages/errors/system-error.page').then((m) => m.SystemErrorPage),
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
          import('./shared/pages/errors/system-error.page').then((m) => m.SystemErrorPage),
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
      import('./shared/pages/errors/system-error.page').then((m) => m.SystemErrorPage),
    data: {
      code: '404',
      title: 'Página no encontrada',
      message: 'La dirección que ingresaste no corresponde a una página disponible.',
    },
    title: 'Página no encontrada | Taji',
  },
];
