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
  staff: {
    root: '/staff/',
    options: '/staff/options/',
    detail: (id: number) => `/staff/${id}/`,
  },
  health: '/health/',
} as const;
