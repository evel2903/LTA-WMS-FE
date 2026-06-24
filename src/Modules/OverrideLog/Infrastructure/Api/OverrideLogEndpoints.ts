function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

/** Root-path endpoint constants for the override log (no /api/v1 prefix). */
export const OVERRIDE_LOG_ENDPOINTS = {
  OVERRIDES: '/overrides',
  OVERRIDE_BY_ID: (id: string) => `/overrides/${pathSegment(id)}`,
} as const;
