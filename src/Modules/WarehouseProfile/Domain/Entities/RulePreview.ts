import type {
  RuleControlMode,
  RulePrecedenceTier,
  SkippedReason,
} from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

/**
 * Domain projection of the B4 `RulePreviewResult` (camelCase). The Preview panel
 * renders directly from this; FE NEVER recomputes winner / skipped / conflict /
 * control mode — every value here is mapped 1:1 from the backend response
 * (architecture 8.2: backend owns truth).
 */

/** The winning (applied) rule; null when no candidate matched. */
export interface AppliedRule {
  ruleCode: string;
  ruleName: string;
  precedenceTier: RulePrecedenceTier;
  controlMode: RuleControlMode;
}

/** A non-winning candidate with the precedence/specificity reason it lost. */
export interface SkippedRule {
  ruleCode: string;
  ruleName: string;
  precedenceTier: RulePrecedenceTier;
  controlMode: RuleControlMode;
  reason: SkippedReason;
}

/** One rule participating in a same-scope, same-tier conflict group. */
export interface ConflictRule {
  ruleCode: string;
  ruleName: string;
  controlMode: RuleControlMode;
}

/** A measured conflict reported as DATA, not an error. */
export interface RuleConflict {
  precedenceTier: RulePrecedenceTier;
  scopeKey: string;
  winnerRuleCode: string;
  rules: ConflictRule[];
}

/** The four-mode summary describing how the winner controls the operation. */
export interface ControlModeSummary {
  mode: RuleControlMode | null;
  isHardBlock: boolean;
  approvalRequired: boolean;
  warning: { message: string; ruleCode: string } | null;
  suggestion: { message: string; ruleCode: string } | null;
}

/** Read-only override-readiness flags copied from the winner (B4 does not enforce). */
export interface ReasonReadiness {
  requiresReason: boolean;
  requiresEvidence: boolean;
  allowOverride: boolean;
}

/** Echo of the actor context, surfaced as metadata for B5 / Epic C. */
export interface ActorContext {
  actorUserId: string | null;
  action: string | null;
  objectType: string | null;
  objectId: string | null;
  reasonCode: string | null;
}

export interface RulePreview {
  winner: AppliedRule | null;
  allowed: boolean;
  approvalRequired: boolean;
  controlMode: ControlModeSummary;
  skippedRules: SkippedRule[];
  conflicts: RuleConflict[];
  reasonReadiness: ReasonReadiness | null;
  actorContext: ActorContext;
}
