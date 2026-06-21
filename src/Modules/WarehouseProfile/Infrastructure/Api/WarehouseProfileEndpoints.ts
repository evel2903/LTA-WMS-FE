/**
 * Root-path endpoint constants for the warehouse-profile / rule-engine API.
 * Paths are the BE controller roots (no `/api/v1`); the `ApiClient` baseURL adds
 * any configured prefix. See the API-prefix guardrail in the B6 story.
 */
export const WAREHOUSE_PROFILE_ENDPOINTS = {
  PROFILES: '/warehouse-profiles',
  PROFILE_BY_ID: (id: string) => `/warehouse-profiles/${id}`,
  PROFILE_CHECKLIST: (id: string) => `/warehouse-profiles/${id}/checklist`,
  PROFILE_ACTIVATE: (id: string) => `/warehouse-profiles/${id}/activate`,
  PROFILE_DEACTIVATE: (id: string) => `/warehouse-profiles/${id}/deactivate`,
  PROFILE_ASSIGNMENTS: (id: string) => `/warehouse-profiles/${id}/assignments`,
  PROFILE_RULES: (id: string) => `/warehouse-profiles/${id}/rules`,
  PROFILE_RULE_BY_ID: (id: string, ruleId: string) => `/warehouse-profiles/${id}/rules/${ruleId}`,
  RULE_GROUPS: '/rule-groups',
  RULE_DEFINITIONS: '/rule-definitions',
  RULES_PREVIEW: '/rules/preview',
} as const;
