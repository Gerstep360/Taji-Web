export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login/',
    register: '/auth/register/',
    refresh: '/auth/refresh/',
    logout: '/auth/logout/',
    me: '/auth/me/',
    forgotPassword: '/auth/forgot-password/',
    resetPassword: '/auth/reset-password/',
  },

  condominium: {
    current: '/condominiums/current/',
  },

  staff: {
    root: '/staff/',
    options: '/staff/options/',
    detail: (id: number) => `/staff/${id}/`,
  },

  roles: {
    root: '/roles/',
    permissions: '/roles/permissions/',
    rolePermissions: (slug: string) => `/roles/${slug}/permissions/`,
    users: '/roles/users/',
    pendingResidents: '/roles/residents/pending/',
    residentReview: (id: number) => `/roles/residents/${id}/review/`,
  },

  health: '/health/',
} as const;