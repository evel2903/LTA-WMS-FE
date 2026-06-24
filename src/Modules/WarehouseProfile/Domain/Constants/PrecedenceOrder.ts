import type {
  RuleControlMode,
  RulePrecedenceTier,
  SkippedReason,
} from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

/**
 * The IMMUTABLE business precedence order (architecture 5.5):
 *
 *   Compliance > Integrity > Physical > Owner/Contract > Operation > Optimization
 *
 * This is the SINGLE FE source of truth for the Rule Matrix tier order. The
 * matrix renders these in array order, top to bottom; it never sorts by data
 * and exposes no reorder control (AC3). Resolution (which rule wins) is owned by
 * the backend and only ever read from the preview response (architecture 8.2).
 */
export interface PrecedenceTierDescriptor {
  tier: RulePrecedenceTier;
  /** Display label for the tier header. */
  label: string;
  /** Short description of what the tier governs. */
  description: string;
}

export const PRECEDENCE_ORDER: readonly PrecedenceTierDescriptor[] = [
  {
    tier: 'COMPLIANCE',
    label: 'Compliance',
    description: 'Regulatory / safety rules. Highest precedence; hard blocks always win.',
  },
  {
    tier: 'INTEGRITY',
    label: 'Integrity',
    description: 'Data and inventory integrity constraints.',
  },
  {
    tier: 'PHYSICAL',
    label: 'Physical',
    description: 'Physical capacity / location capability limits.',
  },
  {
    tier: 'OWNER_CONTRACT',
    label: 'Owner / Contract',
    description: 'Owner and contractual handling requirements.',
  },
  {
    tier: 'OPERATION',
    label: 'Operation',
    description: 'Operational workflow preferences.',
  },
  {
    tier: 'OPTIMIZATION',
    label: 'Optimization',
    description: 'Optimization suggestions; lowest precedence.',
  },
] as const;

/** Tier display labels keyed by enum value, derived from the fixed order. */
export const PRECEDENCE_TIER_LABELS: Record<RulePrecedenceTier, string> = Object.fromEntries(
  PRECEDENCE_ORDER.map((entry) => [entry.tier, entry.label]),
) as Record<RulePrecedenceTier, string>;

/** Human-readable labels for the four control modes (architecture 5.4). */
export const CONTROL_MODE_LABELS: Record<RuleControlMode, string> = {
  HARD_BLOCK: 'Hard block',
  APPROVAL_REQUIRED: 'Approval required',
  SOFT_WARNING: 'Soft warning',
  AUTO_SUGGESTION: 'Auto suggestion',
};

/**
 * Human-readable labels for the finite skipped-reason taxonomy (B4). FE maps the
 * enum the backend returns onto display text; it never decides the reason.
 */
export const SKIPPED_REASON_LABELS: Record<SkippedReason, string> = {
  LOWER_TIER: 'Lower precedence tier',
  LESS_SPECIFIC: 'Less specific scope',
  LOWER_PRIORITY_TIEBREAK: 'Lower priority (tie-break)',
  NEWER_EFFECTIVE_WINS: 'A newer rule wins',
  SHADOWED_BY_COMPLIANCE_HARD_BLOCK: 'Shadowed by a compliance hard block',
};

/** Maps a skipped reason to display text, falling back to the raw code if unknown. */
export function skippedReasonLabel(reason: SkippedReason): string {
  return SKIPPED_REASON_LABELS[reason] ?? reason;
}

export const WAREHOUSE_PROFILE_DEFAULT_PAGE_SIZE = 50;
