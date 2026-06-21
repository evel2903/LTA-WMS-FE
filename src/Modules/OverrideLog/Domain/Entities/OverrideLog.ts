import type {
  ActionCode,
  ObjectType,
  RuleControlMode,
} from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';

/**
 * An immutable override-log entry (C7). Records that an actor overrode a rule outcome on a
 * target object, with the before/after image, reason, evidence and the approval reference that
 * gated it. Read-only — there is no edit/delete (FR-19, V0-AC-03.5).
 */
export interface OverrideLog {
  id: string;
  ruleId: string;
  ruleCode: string;
  actorUserId: string;
  targetObjectType: ObjectType;
  targetObjectId: string;
  targetObjectCode: string | null;
  scope: Record<string, unknown> | null;
  controlMode: RuleControlMode;
  action: ActionCode;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: unknown[] | null;
  approvalRequestId: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  auditRef: string | null;
  correlationId: string | null;
  createdAt: string;
}
