import type {
  ActionCode,
  ObjectType,
  RuleControlMode,
} from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';

export interface PagedDto<TItem> {
  Items: TItem[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface OverrideLogDto {
  Id: string;
  RuleId: string;
  RuleCode: string;
  ActorUserId: string;
  TargetObjectType: ObjectType;
  TargetObjectId: string;
  TargetObjectCode: string | null;
  Scope: Record<string, unknown> | null;
  ControlMode: RuleControlMode;
  Action: ActionCode;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: unknown[] | null;
  ApprovalRequestId: string | null;
  BeforeJson: Record<string, unknown> | null;
  AfterJson: Record<string, unknown> | null;
  AuditRef: string | null;
  CorrelationId: string | null;
  CreatedAt: string;
}
