import type {
  RuleControlMode,
  RulePrecedenceTier,
  RuleStatus,
} from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';
import type {
  ProfileScope,
  WarehouseProfileAuditFields,
} from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';

export interface RuleDefinition extends WarehouseProfileAuditFields, ProfileScope {
  id: string;
  ruleCode: string;
  ruleName: string;
  ruleGroupId: string;
  precedenceTier: RulePrecedenceTier;
  controlMode: RuleControlMode;
  status: RuleStatus;
  warehouseTypeCode: string | null;
  scopeKey: string;
  /** Read-only JSON view in B6 (advanced editor deferred). */
  conditionJson: Record<string, unknown>;
  actionJson: Record<string, unknown>;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  requiresReason: boolean;
  requiresEvidence: boolean;
  allowOverride: boolean;
}
