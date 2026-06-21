import type {
  AssignmentType,
  RuleControlMode,
  RuleGroupCatalogState,
  RulePrecedenceTier,
  RuleStatus,
  SkippedReason,
  WarehouseProfileStatus,
} from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';
import type { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

/** Shared audit/provenance fields on every B-series response DTO (PascalCase wire shape). */
export interface WarehouseProfileAuditDto {
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

/** Paginated list envelope `{ Items, Meta }` (B-series list shape). */
export interface PagedWarehouseProfileDto<TItem> {
  Items: TItem[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface WarehouseProfileDto extends WarehouseProfileAuditDto {
  Id: string;
  ProfileCode: string;
  ProfileName: string;
  WarehouseTypeCode: string;
  Version: number;
  Status: WarehouseProfileStatus;
  WarehouseId: string | null;
  ZoneId: string | null;
  LocationType: string | null;
  OwnerId: string | null;
  SkuId: string | null;
  ItemClass: string | null;
  OrderType: string | null;
  CustomerId: string | null;
  SupplierId: string | null;
  ScopeKey: string;
  EffectiveFrom: string;
  EffectiveTo: string | null;
  CapabilityFlags: Record<string, unknown>;
  StrategyPolicy: Record<string, unknown>;
  ThresholdPolicy: Record<string, unknown>;
  ApprovalPolicy: Record<string, unknown>;
  LabelDevicePolicy: Record<string, unknown>;
  IntegrationPolicy: Record<string, unknown>;
  AuditPolicy: Record<string, unknown>;
}

export interface WarehouseProfileChecklistItemDto {
  Code: string;
  Title: string;
  Status: ProfileChecklistItemStatus;
  Message: string;
  Evidence?: string[];
  DeferredToStory?: string;
}

export interface WarehouseProfileChecklistDto {
  ProfileId: string;
  WarehouseTypeCode: string;
  OverallStatus: ProfileChecklistItemStatus;
  Items: WarehouseProfileChecklistItemDto[];
  EvaluatedAt: string;
}

export interface WarehouseProfileAssignmentDto extends WarehouseProfileAuditDto {
  Id: string;
  WarehouseProfileId: string;
  AssignmentType: AssignmentType;
  WarehouseTypeCode: string | null;
  WarehouseId: string | null;
  ScopeKey: string;
}

export interface RuleGroupDto extends WarehouseProfileAuditDto {
  Id: string;
  GroupCode: string;
  GroupName: string;
  Description: string | null;
  CatalogState: RuleGroupCatalogState;
  DisplayOrder: number | null;
}

export interface RuleDefinitionDto extends WarehouseProfileAuditDto {
  Id: string;
  RuleCode: string;
  RuleName: string;
  RuleGroupId: string;
  PrecedenceTier: RulePrecedenceTier;
  ControlMode: RuleControlMode;
  Status: RuleStatus;
  WarehouseTypeCode: string | null;
  WarehouseId: string | null;
  ZoneId: string | null;
  LocationType: string | null;
  OwnerId: string | null;
  SkuId: string | null;
  ItemClass: string | null;
  OrderType: string | null;
  CustomerId: string | null;
  SupplierId: string | null;
  ScopeKey: string;
  ConditionJson: Record<string, unknown>;
  ActionJson: Record<string, unknown>;
  Priority: number;
  EffectiveFrom: string;
  EffectiveTo: string | null;
  RequiresReason: boolean;
  RequiresEvidence: boolean;
  AllowOverride: boolean;
}

export interface WarehouseProfileRuleDto extends WarehouseProfileAuditDto {
  Id: string;
  WarehouseProfileId: string;
  RuleDefinitionId: string;
  IsEnabled: boolean;
  OverridePriority: number | null;
}

// ── Preview (B4 RulePreviewResult wire shape) ─────────────────────────────────

export interface AppliedRuleViewDto {
  RuleCode: string;
  RuleName: string;
  PrecedenceTier: RulePrecedenceTier;
  ControlMode: RuleControlMode;
}

export interface SkippedRuleViewDto {
  RuleCode: string;
  RuleName: string;
  PrecedenceTier: RulePrecedenceTier;
  ControlMode: RuleControlMode;
  Reason: SkippedReason;
}

export interface ConflictRuleViewDto {
  RuleCode: string;
  RuleName: string;
  ControlMode: RuleControlMode;
}

export interface RuleConflictViewDto {
  PrecedenceTier: RulePrecedenceTier;
  ScopeKey: string;
  WinnerRuleCode: string;
  Rules: ConflictRuleViewDto[];
}

export interface ControlModeSummaryDto {
  Mode: RuleControlMode | null;
  IsHardBlock: boolean;
  ApprovalRequired: boolean;
  Warning?: { Message: string; RuleCode: string };
  Suggestion?: { Message: string; RuleCode: string };
}

export interface ReasonReadinessViewDto {
  RequiresReason: boolean;
  RequiresEvidence: boolean;
  AllowOverride: boolean;
}

export interface ActorContextViewDto {
  ActorUserId: string | null;
  Action: string | null;
  ObjectType: string | null;
  ObjectId: string | null;
  ReasonCode: string | null;
}

export interface RulePreviewResultDto {
  Winner: AppliedRuleViewDto | null;
  Allowed: boolean;
  ApprovalRequired: boolean;
  ControlMode: ControlModeSummaryDto;
  SkippedRules: SkippedRuleViewDto[];
  Conflicts: RuleConflictViewDto[];
  ReasonReadiness: ReasonReadinessViewDto | null;
  ActorContext: ActorContextViewDto;
}

// ── Request DTOs (PascalCase) ─────────────────────────────────────────────────

export interface CreateWarehouseProfileRequestDto {
  ProfileCode: string;
  ProfileName: string;
  WarehouseTypeCode: string;
  EffectiveFrom: string;
  EffectiveTo?: string;
  WarehouseId?: string;
  ZoneId?: string;
  LocationType?: string;
  OwnerId?: string;
  SkuId?: string;
  ItemClass?: string;
  OrderType?: string;
  CustomerId?: string;
  SupplierId?: string;
  CapabilityFlags?: Record<string, unknown>;
  StrategyPolicy?: Record<string, unknown>;
  ThresholdPolicy?: Record<string, unknown>;
  ApprovalPolicy?: Record<string, unknown>;
  LabelDevicePolicy?: Record<string, unknown>;
  IntegrationPolicy?: Record<string, unknown>;
  AuditPolicy?: Record<string, unknown>;
  SourceSystem?: string;
  ReferenceId?: string;
}

export type UpdateWarehouseProfileRequestDto = Partial<CreateWarehouseProfileRequestDto>;

export interface ActivateWarehouseProfileRequestDto {
  ActorUserId?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EffectiveFrom?: string;
  EffectiveTo?: string;
}

export interface DeactivateWarehouseProfileRequestDto {
  ActorUserId?: string;
  ReasonCode?: string;
  ReasonNote?: string;
}

export interface CreateWarehouseProfileAssignmentRequestDto {
  AssignmentType: AssignmentType;
  WarehouseTypeCode?: string;
  WarehouseId?: string;
  SourceSystem?: string;
  ReferenceId?: string;
}

export interface AddWarehouseProfileRuleRequestDto {
  RuleDefinitionId: string;
  IsEnabled?: boolean;
  OverridePriority?: number;
  SourceSystem?: string;
  ReferenceId?: string;
}

/**
 * Wire shape for `POST /rules/preview`, mirroring the merged BE
 * `PreviewRuleResolutionRequest` EXACTLY. There is intentionally NO `ProfileId`:
 * the merged BE request declares none and runs under `forbidNonWhitelisted`, so
 * sending it would yield HTTP 400 (contract divergence — see Dev Notes).
 */
export interface PreviewRuleResolutionRequestDto {
  WarehouseTypeCode: string;
  WarehouseId?: string;
  ZoneId?: string;
  LocationType?: string;
  OwnerId?: string;
  SkuId?: string;
  ItemClass?: string;
  OrderType?: string;
  CustomerId?: string;
  SupplierId?: string;
  ActorUserId?: string;
  Action?: string;
  ObjectType?: string;
  ObjectId?: string;
  ReasonCode?: string;
  EvaluatedAt?: string;
  Attributes?: Record<string, unknown>;
}
