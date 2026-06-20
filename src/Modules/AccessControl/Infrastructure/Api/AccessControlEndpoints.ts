/**
 * Root-path endpoint constants for the RBAC / access-control API. Paths are BE
 * controller roots (no `/api/v1`); the `ApiClient` baseURL adds any configured prefix.
 */
export const ACCESS_CONTROL_ENDPOINTS = {
  ROLES: '/access-control/roles',
  ROLE_BY_CODE: (roleCode: string) => `/access-control/roles/${roleCode}`,
  PERMISSIONS: '/access-control/permissions',
  USERS: '/users',
  USER_EFFECTIVE: (userId: string) => `/access-control/users/${userId}/effective-permissions`,
  USER_ROLES: (userId: string) => `/access-control/users/${userId}/roles`,
  USER_ROLE: (userId: string, roleCode: string) => `/access-control/users/${userId}/roles/${roleCode}`,
  USER_DATA_SCOPES: (userId: string) => `/access-control/users/${userId}/data-scopes`,
  USER_DATA_SCOPE: (userId: string, scopeId: string) =>
    `/access-control/users/${userId}/data-scopes/${scopeId}`,
} as const;
