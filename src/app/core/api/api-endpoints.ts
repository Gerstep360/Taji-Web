export const API_ENDPOINTS = {
  visitConsultation: '/security/cu12/visits/',
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

  residents: {
    root: '/residents/',
    options: '/residents/options/',
    detail: (id: number) => `/residents/${id}/`,
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
  sectors: {
    root: '/sectors/',
    options: '/sectors/options/',
    detail: (id: number) => `/sectors/${id}/`,
  },
  units: {
    root: '/units/',
    options: '/units/options/',
    detail: (id: number) => `/units/${id}/`,
  },
  residentDirectory: {
    root: '/resident-directory/',
  },
  residentUnits: {
    root: '/resident-units/',
    detail: (id: number) => `/resident-units/${id}/`,
  },
  audit: {
    root: '/audit/',
  },
  security: {
    root: '/security/access-events/',
    people: '/security/access-events/people/',
    units: '/security/access-events/units/',
    biometrics: {
      root: '/security/cu17/biometrics/',
      enroll: '/security/cu17/biometrics/enroll/',
      history: (residentId: number) => `/security/cu17/biometrics/resident/${residentId}/history/`,
    },
    faceVerification: {
      root: '/security/cu17/face-verification/',
      match: '/security/cu17/face-verification/match/',
      confirm: '/security/cu17/face-verification/confirm/',
    },
  },
  visitAuthorizations: {
    root: '/visit-authorizations/',
    options: '/visit-authorizations/options/',
    detail: (id: number) => `/visit-authorizations/${id}/`,
    cancel: (id: number) => `/visit-authorizations/${id}/cancel/`,
  },
  saas: {
    plans: '/saas/plans/',
    paymentConfig: '/saas/payment-config/',
    subscription: '/saas/subscription/',
    createIntent: '/saas/checkout/create-intent/',
    confirmSandbox: '/saas/checkout/confirm-sandbox/',
    webhook: '/saas/checkout/webhook/',
    payments: '/saas/payments/',
    myCondominium: '/saas/my-condominium/',
    myTenants: '/saas/my-tenants/',
    switchTenant: '/saas/switch-tenant/',
    onboardingRegister: '/saas/onboarding/register/',
    publicCondominiums: '/saas/condominiums/public/',
  },
} as const;
