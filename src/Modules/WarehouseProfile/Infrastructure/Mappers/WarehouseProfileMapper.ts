import type { PaginatedResponse } from '@shared/Types/Api';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { RuleGroup } from '@modules/WarehouseProfile/Domain/Entities/RuleGroup';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { WarehouseProfileAssignment } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignment';
import type { WarehouseProfileRule } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRule';
import type {
  ActivateWarehouseProfileInput,
  AddProfileRuleInput,
  CreateAssignmentInput,
  CreateWarehouseProfileInput,
  DeactivateWarehouseProfileInput,
  PreviewContextInput,
  UpdateWarehouseProfileInput,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileInputs';
import type {
  ActivateWarehouseProfileRequestDto,
  AddWarehouseProfileRuleRequestDto,
  CreateWarehouseProfileAssignmentRequestDto,
  CreateWarehouseProfileRequestDto,
  DeactivateWarehouseProfileRequestDto,
  PagedWarehouseProfileDto,
  PreviewRuleResolutionRequestDto,
  RuleDefinitionDto,
  RuleGroupDto,
  RulePreviewResultDto,
  UpdateWarehouseProfileRequestDto,
  WarehouseProfileAssignmentDto,
  WarehouseProfileDto,
  WarehouseProfileRuleDto,
} from '@modules/WarehouseProfile/Infrastructure/Dtos/WarehouseProfileDtos';

/**
 * Strips nullish fields so create/PATCH/activate payloads OMIT them. PATCH is
 * partial-by-omission per the project OMIT contract: an absent field means "no
 * change", and `null` is also stripped (the BE forbids null for
 * business-required fields). `false` and `0` are real values and survive.
 */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export const WarehouseProfileMapper = {
  toPaged<TDto, TEntity>(
    dto: PagedWarehouseProfileDto<TDto>,
    mapper: (item: TDto) => TEntity,
  ): PaginatedResponse<TEntity> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map(mapper),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toProfile(dto: WarehouseProfileDto): WarehouseProfile {
    return {
      id: dto.Id,
      profileCode: dto.ProfileCode,
      profileName: dto.ProfileName,
      warehouseTypeCode: dto.WarehouseTypeCode,
      version: dto.Version,
      status: dto.Status,
      warehouseId: dto.WarehouseId,
      zoneId: dto.ZoneId,
      locationType: dto.LocationType,
      ownerId: dto.OwnerId,
      skuId: dto.SkuId,
      itemClass: dto.ItemClass,
      orderType: dto.OrderType,
      customerId: dto.CustomerId,
      supplierId: dto.SupplierId,
      scopeKey: dto.ScopeKey,
      effectiveFrom: dto.EffectiveFrom,
      effectiveTo: dto.EffectiveTo,
      capabilityFlags: dto.CapabilityFlags,
      strategyPolicy: dto.StrategyPolicy,
      thresholdPolicy: dto.ThresholdPolicy,
      approvalPolicy: dto.ApprovalPolicy,
      labelDevicePolicy: dto.LabelDevicePolicy,
      integrationPolicy: dto.IntegrationPolicy,
      auditPolicy: dto.AuditPolicy,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toAssignment(dto: WarehouseProfileAssignmentDto): WarehouseProfileAssignment {
    return {
      id: dto.Id,
      warehouseProfileId: dto.WarehouseProfileId,
      assignmentType: dto.AssignmentType,
      warehouseTypeCode: dto.WarehouseTypeCode,
      warehouseId: dto.WarehouseId,
      scopeKey: dto.ScopeKey,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toRuleGroup(dto: RuleGroupDto): RuleGroup {
    return {
      id: dto.Id,
      groupCode: dto.GroupCode,
      groupName: dto.GroupName,
      description: dto.Description,
      catalogState: dto.CatalogState,
      displayOrder: dto.DisplayOrder,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toRuleDefinition(dto: RuleDefinitionDto): RuleDefinition {
    return {
      id: dto.Id,
      ruleCode: dto.RuleCode,
      ruleName: dto.RuleName,
      ruleGroupId: dto.RuleGroupId,
      precedenceTier: dto.PrecedenceTier,
      controlMode: dto.ControlMode,
      status: dto.Status,
      warehouseTypeCode: dto.WarehouseTypeCode,
      warehouseId: dto.WarehouseId,
      zoneId: dto.ZoneId,
      locationType: dto.LocationType,
      ownerId: dto.OwnerId,
      skuId: dto.SkuId,
      itemClass: dto.ItemClass,
      orderType: dto.OrderType,
      customerId: dto.CustomerId,
      supplierId: dto.SupplierId,
      scopeKey: dto.ScopeKey,
      conditionJson: dto.ConditionJson,
      actionJson: dto.ActionJson,
      priority: dto.Priority,
      effectiveFrom: dto.EffectiveFrom,
      effectiveTo: dto.EffectiveTo,
      requiresReason: dto.RequiresReason,
      requiresEvidence: dto.RequiresEvidence,
      allowOverride: dto.AllowOverride,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toProfileRule(dto: WarehouseProfileRuleDto): WarehouseProfileRule {
    return {
      id: dto.Id,
      warehouseProfileId: dto.WarehouseProfileId,
      ruleDefinitionId: dto.RuleDefinitionId,
      isEnabled: dto.IsEnabled,
      overridePriority: dto.OverridePriority,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  /**
   * Maps the B4 preview response 1:1 to the Domain shape. FE never recomputes any
   * of this. Null-guards (like `toPaged`) tolerate a partial/empty envelope so a
   * malformed response degrades gracefully instead of throwing in the panel.
   */
  toPreview(dto: RulePreviewResultDto): RulePreview {
    const summary = dto.ControlMode ?? { Mode: null, IsHardBlock: false, ApprovalRequired: false };
    const actor = dto.ActorContext;
    return {
      winner: dto.Winner
        ? {
            ruleCode: dto.Winner.RuleCode,
            ruleName: dto.Winner.RuleName,
            precedenceTier: dto.Winner.PrecedenceTier,
            controlMode: dto.Winner.ControlMode,
          }
        : null,
      allowed: dto.Allowed ?? false,
      approvalRequired: dto.ApprovalRequired ?? false,
      controlMode: {
        mode: summary.Mode,
        isHardBlock: summary.IsHardBlock,
        approvalRequired: summary.ApprovalRequired,
        warning: summary.Warning
          ? { message: summary.Warning.Message, ruleCode: summary.Warning.RuleCode }
          : null,
        suggestion: summary.Suggestion
          ? { message: summary.Suggestion.Message, ruleCode: summary.Suggestion.RuleCode }
          : null,
      },
      skippedRules: (dto.SkippedRules ?? []).map((rule) => ({
        ruleCode: rule.RuleCode,
        ruleName: rule.RuleName,
        precedenceTier: rule.PrecedenceTier,
        controlMode: rule.ControlMode,
        reason: rule.Reason,
      })),
      conflicts: (dto.Conflicts ?? []).map((conflict) => ({
        precedenceTier: conflict.PrecedenceTier,
        scopeKey: conflict.ScopeKey,
        winnerRuleCode: conflict.WinnerRuleCode,
        rules: conflict.Rules.map((rule) => ({
          ruleCode: rule.RuleCode,
          ruleName: rule.RuleName,
          controlMode: rule.ControlMode,
        })),
      })),
      reasonReadiness: dto.ReasonReadiness
        ? {
            requiresReason: dto.ReasonReadiness.RequiresReason,
            requiresEvidence: dto.ReasonReadiness.RequiresEvidence,
            allowOverride: dto.ReasonReadiness.AllowOverride,
          }
        : null,
      actorContext: {
        actorUserId: actor?.ActorUserId ?? null,
        action: actor?.Action ?? null,
        objectType: actor?.ObjectType ?? null,
        objectId: actor?.ObjectId ?? null,
        reasonCode: actor?.ReasonCode ?? null,
      },
    };
  },

  // ── Request builders (PascalCase, nullish stripped per OMIT contract) ───────

  toCreateProfileRequest(input: CreateWarehouseProfileInput): CreateWarehouseProfileRequestDto {
    return removeEmpty({
      ProfileCode: input.profileCode,
      ProfileName: input.profileName,
      WarehouseTypeCode: input.warehouseTypeCode,
      EffectiveFrom: input.effectiveFrom,
      EffectiveTo: input.effectiveTo,
      WarehouseId: input.warehouseId,
      ZoneId: input.zoneId,
      LocationType: input.locationType,
      OwnerId: input.ownerId,
      SkuId: input.skuId,
      ItemClass: input.itemClass,
      OrderType: input.orderType,
      CustomerId: input.customerId,
      SupplierId: input.supplierId,
      CapabilityFlags: input.capabilityFlags,
      StrategyPolicy: input.strategyPolicy,
      ThresholdPolicy: input.thresholdPolicy,
      ApprovalPolicy: input.approvalPolicy,
      LabelDevicePolicy: input.labelDevicePolicy,
      IntegrationPolicy: input.integrationPolicy,
      AuditPolicy: input.auditPolicy,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    }) as CreateWarehouseProfileRequestDto;
  },

  toUpdateProfileRequest(input: UpdateWarehouseProfileInput): UpdateWarehouseProfileRequestDto {
    return removeEmpty({
      ProfileCode: input.profileCode,
      ProfileName: input.profileName,
      WarehouseTypeCode: input.warehouseTypeCode,
      EffectiveFrom: input.effectiveFrom,
      EffectiveTo: input.effectiveTo,
      WarehouseId: input.warehouseId,
      ZoneId: input.zoneId,
      LocationType: input.locationType,
      OwnerId: input.ownerId,
      SkuId: input.skuId,
      ItemClass: input.itemClass,
      OrderType: input.orderType,
      CustomerId: input.customerId,
      SupplierId: input.supplierId,
      CapabilityFlags: input.capabilityFlags,
      StrategyPolicy: input.strategyPolicy,
      ThresholdPolicy: input.thresholdPolicy,
      ApprovalPolicy: input.approvalPolicy,
      LabelDevicePolicy: input.labelDevicePolicy,
      IntegrationPolicy: input.integrationPolicy,
      AuditPolicy: input.auditPolicy,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    }) as UpdateWarehouseProfileRequestDto;
  },

  toActivateRequest(input: ActivateWarehouseProfileInput): ActivateWarehouseProfileRequestDto {
    return removeEmpty({
      ActorUserId: input.actorUserId,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EffectiveFrom: input.effectiveFrom,
      EffectiveTo: input.effectiveTo,
    }) as ActivateWarehouseProfileRequestDto;
  },

  toDeactivateRequest(input: DeactivateWarehouseProfileInput): DeactivateWarehouseProfileRequestDto {
    return removeEmpty({
      ActorUserId: input.actorUserId,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
    }) as DeactivateWarehouseProfileRequestDto;
  },

  toCreateAssignmentRequest(
    input: CreateAssignmentInput,
  ): CreateWarehouseProfileAssignmentRequestDto {
    return removeEmpty({
      AssignmentType: input.assignmentType,
      WarehouseTypeCode: input.warehouseTypeCode,
      WarehouseId: input.warehouseId,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    }) as CreateWarehouseProfileAssignmentRequestDto;
  },

  toAddProfileRuleRequest(input: AddProfileRuleInput): AddWarehouseProfileRuleRequestDto {
    return removeEmpty({
      RuleDefinitionId: input.ruleDefinitionId,
      IsEnabled: input.isEnabled,
      OverridePriority: input.overridePriority,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    }) as AddWarehouseProfileRuleRequestDto;
  },

  /**
   * Builds the `/rules/preview` body. NOTE (contract divergence — Dev Notes): the
   * merged BE `PreviewRuleResolutionRequest` declares NO `ProfileId` and runs under
   * `forbidNonWhitelisted`, so emitting it would 400. We deliberately do NOT map any
   * `profileId` onto the wire; the self-check resolves by scope only.
   */
  toPreviewRequest(input: PreviewContextInput): PreviewRuleResolutionRequestDto {
    return removeEmpty({
      WarehouseTypeCode: input.warehouseTypeCode,
      WarehouseId: input.warehouseId,
      ZoneId: input.zoneId,
      LocationType: input.locationType,
      OwnerId: input.ownerId,
      SkuId: input.skuId,
      ItemClass: input.itemClass,
      OrderType: input.orderType,
      CustomerId: input.customerId,
      SupplierId: input.supplierId,
      ActorUserId: input.actorUserId,
      Action: input.action,
      ObjectType: input.objectType,
      ObjectId: input.objectId,
      ReasonCode: input.reasonCode,
      EvaluatedAt: input.evaluatedAt,
      Attributes: input.attributes,
    }) as PreviewRuleResolutionRequestDto;
  },
};
