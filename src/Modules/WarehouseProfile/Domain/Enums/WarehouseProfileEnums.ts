/**
 * V0 warehouse-profile / rule-engine enums. These MIRROR the backend wire enum
 * string values (PascalCase keys, SCREAMING_SNAKE values) exactly — the mapper
 * passes them through unchanged, so the union string literals ARE the contract.
 * FE never invents a new status / tier / control mode (story guardrails).
 */

/** Profile lifecycle (architecture 5.2). Create always yields DRAFT; status changes via activate/deactivate. */
export type WarehouseProfileStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'RETIRED';

/** Assignment scope kind (B1). */
export type AssignmentType = 'WAREHOUSE_TYPE' | 'WAREHOUSE';

/** Rule lifecycle status (B2). */
export type RuleStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

/** Six fixed precedence tiers (architecture 5.4 / 5.5). Compliance is highest. */
export type RulePrecedenceTier =
  | 'COMPLIANCE'
  | 'INTEGRITY'
  | 'PHYSICAL'
  | 'OWNER_CONTRACT'
  | 'OPERATION'
  | 'OPTIMIZATION';

/** Four control modes (architecture 5.4). FE renders these; it does not resolve them. */
export type RuleControlMode =
  | 'HARD_BLOCK'
  | 'APPROVAL_REQUIRED'
  | 'SOFT_WARNING'
  | 'AUTO_SUGGESTION';

/** Rule-group catalog state (B2). */
export type RuleGroupCatalogState = 'ACTIVE' | 'PLACEHOLDER';

/**
 * Finite skipped-reason taxonomy (B4). FE label-maps these for display; it never
 * computes a reason — the value always arrives from the preview response.
 */
export type SkippedReason =
  | 'LOWER_TIER'
  | 'LESS_SPECIFIC'
  | 'LOWER_PRIORITY_TIEBREAK'
  | 'NEWER_EFFECTIVE_WINS'
  | 'SHADOWED_BY_COMPLIANCE_HARD_BLOCK';

export const WAREHOUSE_PROFILE_STATUSES: readonly WarehouseProfileStatus[] = [
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'RETIRED',
];

export const ASSIGNMENT_TYPES: readonly AssignmentType[] = ['WAREHOUSE_TYPE', 'WAREHOUSE'];

export const RULE_CONTROL_MODES: readonly RuleControlMode[] = [
  'HARD_BLOCK',
  'APPROVAL_REQUIRED',
  'SOFT_WARNING',
  'AUTO_SUGGESTION',
];
