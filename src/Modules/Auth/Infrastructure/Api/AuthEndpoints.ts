/**
 * Auth endpoint paths. These sit at the HOST ROOT (e.g. http://host/auth/login),
 * outside the WMS API prefix — the repository sends them with AUTH_REQUEST_CONFIG.
 */
export const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  ME: '/auth/me',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  LOGOUT_ALL: '/auth/logout-all',
  ADMIN: '/auth/admin',
} as const;
