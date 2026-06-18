import { describe, expect, it } from 'vitest';

import { WarehouseProfileMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/WarehouseProfileMapper';
import type {
  RuleDefinitionDto,
  RuleGroupDto,
  RulePreviewResultDto,
  WarehouseProfileAssignmentDto,
  WarehouseProfileDto,
} from '@modules/WarehouseProfile/Infrastructure/Dtos/WarehouseProfileDtos';

const audit = {
  SourceSystem: 'SEED',
  ReferenceId: 'ref-1',
  CreatedAt: '2026-06-01T00:00:00.000Z',
  UpdatedAt: '2026-06-02T00:00:00.000Z',
  CreatedBy: 'alice',
  UpdatedBy: null,
};

const profileDto: WarehouseProfileDto = {
  Id: 'profile-1',
  ProfileCode: 'WP-01',
  ProfileName: 'Default',
  WarehouseTypeCode: 'DC',
  Version: 3,
  Status: 'DRAFT',
  WarehouseId: 'wh-1',
  ZoneId: null,
  LocationType: null,
  OwnerId: 'owner-1',
  SkuId: null,
  ItemClass: null,
  OrderType: null,
  CustomerId: null,
  SupplierId: null,
  ScopeKey: 'DC|wh-1',
  EffectiveFrom: '2026-06-01T00:00:00.000Z',
  EffectiveTo: null,
  CapabilityFlags: { allowMixSku: true },
  StrategyPolicy: {},
  ThresholdPolicy: {},
  ApprovalPolicy: {},
  LabelDevicePolicy: {},
  IntegrationPolicy: {},
  AuditPolicy: {},
  ...audit,
};

describe('WarehouseProfileMapper.toProfile', () => {
  it('maps every PascalCase DTO field onto the camelCase domain shape', () => {
    const profile = WarehouseProfileMapper.toProfile(profileDto);

    expect(profile).toMatchObject({
      id: 'profile-1',
      profileCode: 'WP-01',
      profileName: 'Default',
      warehouseTypeCode: 'DC',
      version: 3,
      status: 'DRAFT',
      warehouseId: 'wh-1',
      zoneId: null,
      ownerId: 'owner-1',
      scopeKey: 'DC|wh-1',
      effectiveFrom: '2026-06-01T00:00:00.000Z',
      effectiveTo: null,
      capabilityFlags: { allowMixSku: true },
      sourceSystem: 'SEED',
      createdBy: 'alice',
      updatedBy: null,
    });
  });
});

describe('WarehouseProfileMapper.toPaged', () => {
  it('maps Items/Meta envelope and defaults a null payload to an empty page', () => {
    const paged = WarehouseProfileMapper.toPaged(
      { Items: [profileDto], Meta: { Page: 2, PageSize: 20, TotalItems: 21, TotalPages: 2 } },
      (item) => WarehouseProfileMapper.toProfile(item),
    );
    expect(paged.items).toHaveLength(1);
    expect(paged.page).toBe(2);
    expect(paged.totalItems).toBe(21);

    const empty = WarehouseProfileMapper.toPaged(
      null as unknown as { Items: WarehouseProfileDto[]; Meta: never },
      (item) => WarehouseProfileMapper.toProfile(item),
    );
    expect(empty.items).toEqual([]);
    expect(empty.totalItems).toBe(0);
  });
});

describe('WarehouseProfileMapper create/update request (PATCH OMIT)', () => {
  it('builds a PascalCase create payload with the required header + effective date', () => {
    const dto = WarehouseProfileMapper.toCreateProfileRequest({
      profileCode: 'WP-01',
      profileName: 'Default',
      warehouseTypeCode: 'DC',
      effectiveFrom: '2026-06-01',
      ownerId: 'owner-1',
    });
    expect(dto).toEqual({
      ProfileCode: 'WP-01',
      ProfileName: 'Default',
      WarehouseTypeCode: 'DC',
      EffectiveFrom: '2026-06-01',
      OwnerId: 'owner-1',
    });
    // status must never be sent on create (always DRAFT on the backend).
    expect('Status' in dto).toBe(false);
  });

  it('omits absent AND null fields on update (omit-by-strip contract)', () => {
    const dto = WarehouseProfileMapper.toUpdateProfileRequest({
      profileName: 'Renamed',
      warehouseId: null,
      ownerId: undefined,
    });
    expect(dto).toEqual({ ProfileName: 'Renamed' });
    expect('WarehouseId' in dto).toBe(false);
    expect('OwnerId' in dto).toBe(false);
  });
});

describe('WarehouseProfileMapper activate/deactivate/assignment request', () => {
  it('passes reason context through and omits nullish fields on activate', () => {
    const dto = WarehouseProfileMapper.toActivateRequest({
      reasonCode: 'POLICY_CHANGE',
      reasonNote: 'Quarterly refresh',
      actorUserId: null,
      effectiveFrom: '2026-07-01',
    });
    expect(dto).toEqual({
      ReasonCode: 'POLICY_CHANGE',
      ReasonNote: 'Quarterly refresh',
      EffectiveFrom: '2026-07-01',
    });
    expect('ActorUserId' in dto).toBe(false);
  });

  it('builds an assignment create payload', () => {
    const dto = WarehouseProfileMapper.toCreateAssignmentRequest({
      assignmentType: 'WAREHOUSE',
      warehouseId: 'wh-9',
    });
    expect(dto).toEqual({ AssignmentType: 'WAREHOUSE', WarehouseId: 'wh-9' });
  });

  it('maps an assignment DTO to domain', () => {
    const assignmentDto: WarehouseProfileAssignmentDto = {
      Id: 'a-1',
      WarehouseProfileId: 'profile-1',
      AssignmentType: 'WAREHOUSE_TYPE',
      WarehouseTypeCode: 'DC',
      WarehouseId: null,
      ScopeKey: 'DC',
      ...audit,
    };
    expect(WarehouseProfileMapper.toAssignment(assignmentDto)).toMatchObject({
      id: 'a-1',
      assignmentType: 'WAREHOUSE_TYPE',
      warehouseTypeCode: 'DC',
      warehouseId: null,
    });
  });
});

describe('WarehouseProfileMapper preview context request', () => {
  it('sends the six axes + reason metadata in PascalCase, omitting nullish and ProfileId', () => {
    const dto = WarehouseProfileMapper.toPreviewRequest({
      warehouseTypeCode: 'DC',
      ownerId: 'owner-1',
      // A profileId leaking into the context must NOT reach the wire (contract divergence):
      // the merged BE PreviewRuleResolutionRequest forbids it under forbidNonWhitelisted.
      profileId: 'profile-1',
      reasonCode: 'OVERRIDE',
      warehouseId: null,
      evaluatedAt: undefined,
    } as Parameters<typeof WarehouseProfileMapper.toPreviewRequest>[0]);
    expect(dto).toEqual({
      WarehouseTypeCode: 'DC',
      OwnerId: 'owner-1',
      ReasonCode: 'OVERRIDE',
    });
    expect('ProfileId' in dto).toBe(false);
    expect('WarehouseId' in dto).toBe(false);
  });
});

describe('WarehouseProfileMapper.toRuleGroup / toRuleDefinition', () => {
  it('maps a rule group DTO to domain camelCase', () => {
    const dto: RuleGroupDto = {
      Id: 'g-1',
      GroupCode: 'COMP',
      GroupName: 'Compliance',
      Description: null,
      CatalogState: 'ACTIVE',
      DisplayOrder: 1,
      SourceSystem: null,
      ReferenceId: null,
      CreatedAt: audit.CreatedAt,
      UpdatedAt: audit.UpdatedAt,
      CreatedBy: null,
      UpdatedBy: null,
    };
    expect(WarehouseProfileMapper.toRuleGroup(dto)).toMatchObject({
      id: 'g-1',
      groupCode: 'COMP',
      catalogState: 'ACTIVE',
      displayOrder: 1,
    });
  });

  it('maps a rule definition DTO including tier, control mode and JSON', () => {
    const dto: RuleDefinitionDto = {
      Id: 'r-1',
      RuleCode: 'NO-MIX',
      RuleName: 'No mixing',
      RuleGroupId: 'g-1',
      PrecedenceTier: 'COMPLIANCE',
      ControlMode: 'HARD_BLOCK',
      Status: 'ACTIVE',
      WarehouseTypeCode: 'DC',
      WarehouseId: null,
      ZoneId: null,
      LocationType: null,
      OwnerId: null,
      SkuId: null,
      ItemClass: null,
      OrderType: null,
      CustomerId: null,
      SupplierId: null,
      ScopeKey: 'DC',
      ConditionJson: { op: 'eq' },
      ActionJson: { block: true },
      Priority: 100,
      EffectiveFrom: audit.CreatedAt,
      EffectiveTo: null,
      RequiresReason: true,
      RequiresEvidence: false,
      AllowOverride: false,
      SourceSystem: null,
      ReferenceId: null,
      CreatedAt: audit.CreatedAt,
      UpdatedAt: audit.UpdatedAt,
      CreatedBy: null,
      UpdatedBy: null,
    };
    expect(WarehouseProfileMapper.toRuleDefinition(dto)).toMatchObject({
      id: 'r-1',
      ruleCode: 'NO-MIX',
      precedenceTier: 'COMPLIANCE',
      controlMode: 'HARD_BLOCK',
      conditionJson: { op: 'eq' },
      actionJson: { block: true },
      priority: 100,
      requiresReason: true,
      allowOverride: false,
    });
  });
});

describe('WarehouseProfileMapper.toPreview (B4 RulePreviewResult)', () => {
  const previewDto: RulePreviewResultDto = {
    Winner: {
      RuleCode: 'NO-MIX',
      RuleName: 'No mixing',
      PrecedenceTier: 'COMPLIANCE',
      ControlMode: 'HARD_BLOCK',
    },
    Allowed: false,
    ApprovalRequired: false,
    ControlMode: {
      Mode: 'HARD_BLOCK',
      IsHardBlock: true,
      ApprovalRequired: false,
    },
    SkippedRules: [
      {
        RuleCode: 'PREFER-A',
        RuleName: 'Prefer A',
        PrecedenceTier: 'OPTIMIZATION',
        ControlMode: 'AUTO_SUGGESTION',
        Reason: 'LOWER_TIER',
      },
    ],
    Conflicts: [
      {
        PrecedenceTier: 'PHYSICAL',
        ScopeKey: 'DC|wh-1',
        WinnerRuleCode: 'CAP-1',
        Rules: [
          { RuleCode: 'CAP-1', RuleName: 'Cap 1', ControlMode: 'HARD_BLOCK' },
          { RuleCode: 'CAP-2', RuleName: 'Cap 2', ControlMode: 'SOFT_WARNING' },
        ],
      },
    ],
    ReasonReadiness: { RequiresReason: true, RequiresEvidence: false, AllowOverride: false },
    ActorContext: {
      ActorUserId: 'alice',
      Action: 'PUTAWAY',
      ObjectType: null,
      ObjectId: null,
      ReasonCode: null,
    },
  };

  it('maps winner, control-mode summary, skipped reasons and conflicts to domain camelCase', () => {
    const preview = WarehouseProfileMapper.toPreview(previewDto);

    expect(preview.winner).toMatchObject({ ruleCode: 'NO-MIX', controlMode: 'HARD_BLOCK' });
    expect(preview.allowed).toBe(false);
    expect(preview.controlMode).toMatchObject({ mode: 'HARD_BLOCK', isHardBlock: true });
    // Optional warning/suggestion default to null when absent.
    expect(preview.controlMode.warning).toBeNull();
    expect(preview.controlMode.suggestion).toBeNull();

    expect(preview.skippedRules[0]).toMatchObject({ ruleCode: 'PREFER-A', reason: 'LOWER_TIER' });
    expect(preview.conflicts[0]).toMatchObject({
      precedenceTier: 'PHYSICAL',
      scopeKey: 'DC|wh-1',
      winnerRuleCode: 'CAP-1',
    });
    expect(preview.conflicts[0]?.rules).toHaveLength(2);
    expect(preview.reasonReadiness).toMatchObject({ requiresReason: true, allowOverride: false });
    expect(preview.actorContext.actorUserId).toBe('alice');
  });

  it('maps a null winner (no rule applied) and preserves warning/suggestion messages', () => {
    const preview = WarehouseProfileMapper.toPreview({
      ...previewDto,
      Winner: null,
      ReasonReadiness: null,
      ControlMode: {
        Mode: 'SOFT_WARNING',
        IsHardBlock: false,
        ApprovalRequired: false,
        Warning: { Message: 'Heads up', RuleCode: 'WARN-1' },
        Suggestion: { Message: 'Try B', RuleCode: 'SUG-1' },
      },
    });
    expect(preview.winner).toBeNull();
    expect(preview.reasonReadiness).toBeNull();
    expect(preview.controlMode.warning).toEqual({ message: 'Heads up', ruleCode: 'WARN-1' });
    expect(preview.controlMode.suggestion).toEqual({ message: 'Try B', ruleCode: 'SUG-1' });
  });
});
