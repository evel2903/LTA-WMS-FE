import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

/** RH-04 (RH-ASG-01 / D3) FE-facing assignment intent types. Versions are canonical decimal
 * strings (BIGINT); compare with `BigInt(...)`, never JS `number`. */
export type IntentOperation = 'assign' | 'remove';

// 'Superseded' can arrive on a register-replay of a superseded run — the BE emits the persisted
// status verbatim, so the FE union must include it (Review Finding, round 1).
export type IntentStatus = 'Idle' | 'Registered' | 'Applied' | 'SatisfiedNoChange' | 'Superseded';

export interface RegisterIntentResult {
  runId: string;
  operation: IntentOperation;
  status: IntentStatus;
  intentVersion: string;
  effectiveVersion: string;
  isCurrent: boolean;
}

/** Apply outcome (assign or remove). `assigned`/`removed` present per operation. */
export interface ApplyIntentResult {
  status: IntentStatus;
  runId: string;
  intentVersion: string;
  effectiveVersion: string;
  roleCode: RoleCode;
  assigned?: boolean;
  removed?: boolean;
}

/** Authoritative recovery snapshot for one (user, role) item — raw assignment truth. */
export interface AssignmentIntentSnapshot {
  userId: string;
  roleCode: RoleCode;
  runId: string | null;
  operation: IntentOperation | null;
  status: IntentStatus;
  intentVersion: string;
  effectiveVersion: string;
  assignedRoleCodes: RoleCode[];
  isOwnedByCurrentActor: boolean;
}
