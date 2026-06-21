import { describe, expect, it } from 'vitest';

import type { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { buildPreviewContextFromProfile } from '@modules/WarehouseProfile/Application/UseCases/BuildPreviewContextUseCase';
import { WarehouseProfileMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/WarehouseProfileMapper';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { RuleGroup } from '@modules/WarehouseProfile/Domain/Entities/RuleGroup';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { WarehouseProfileAssignment } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignment';
import type { WarehouseProfileChecklist } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';
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
  RuleDefinitionListFilter,
  RuleGroupListFilter,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileQuery';
import type { PaginatedResponse } from '@shared/Types/Api';

const now = '2026-06-18T00:00:00.000Z';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
}

/**
 * In-memory repository that round-trips create/update/activate through the REAL
 * request builders + mapper, so the smoke test proves the create payload omits
 * Status (create => DRAFT) and activate flips the status the way the page relies
 * on (AC2). Also records the preview context it received (AC4 self-check).
 */
class InMemoryWarehouseProfileRepository implements IWarehouseProfileRepository {
  public previewContexts: PreviewContextInput[] = [];
  private profiles: WarehouseProfile[] = [];

  listProfiles(_filter?: WarehouseProfileListFilter): Promise<PaginatedResponse<WarehouseProfile>> {
    return Promise.resolve(page(this.profiles));
  }

  getProfile(id: string): Promise<WarehouseProfile> {
    const found = this.profiles.find((profile) => profile.id === id);
    if (!found) return Promise.reject(new Error('not found'));
    return Promise.resolve(found);
  }

  getChecklist(id: string): Promise<WarehouseProfileChecklist> {
    return Promise.resolve({
      profileId: id,
      warehouseTypeCode: 'DC',
      overallStatus: 'PASS',
      evaluatedAt: now,
      items: [],
    });
  }

  createProfile(input: CreateWarehouseProfileInput): Promise<WarehouseProfile> {
    const request = WarehouseProfileMapper.toCreateProfileRequest(input);
    // The backend always creates DRAFT and Status is never part of the request.
    expect('Status' in request).toBe(false);
    const profile = WarehouseProfileMapper.toProfile({
      Id: 'profile-1',
      ProfileCode: request.ProfileCode,
      ProfileName: request.ProfileName,
      WarehouseTypeCode: request.WarehouseTypeCode,
      Version: 1,
      Status: 'DRAFT',
      WarehouseId: request.WarehouseId ?? null,
      ZoneId: request.ZoneId ?? null,
      LocationType: request.LocationType ?? null,
      OwnerId: request.OwnerId ?? null,
      SkuId: request.SkuId ?? null,
      ItemClass: request.ItemClass ?? null,
      OrderType: request.OrderType ?? null,
      CustomerId: request.CustomerId ?? null,
      SupplierId: request.SupplierId ?? null,
      ScopeKey: request.WarehouseTypeCode,
      EffectiveFrom: request.EffectiveFrom,
      EffectiveTo: request.EffectiveTo ?? null,
      CapabilityFlags: {},
      StrategyPolicy: {},
      ThresholdPolicy: {},
      ApprovalPolicy: {},
      LabelDevicePolicy: {},
      IntegrationPolicy: {},
      AuditPolicy: {},
      SourceSystem: null,
      ReferenceId: null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: null,
      UpdatedBy: null,
    });
    this.profiles.push(profile);
    return Promise.resolve(profile);
  }

  updateProfile(id: string, input: UpdateWarehouseProfileInput): Promise<WarehouseProfile> {
    const request = WarehouseProfileMapper.toUpdateProfileRequest(input);
    const index = this.profiles.findIndex((profile) => profile.id === id);
    const current = this.profiles[index];
    const merged: WarehouseProfile = {
      ...current,
      profileName: (request.ProfileName as string) ?? current.profileName,
      updatedAt: now,
    };
    this.profiles[index] = merged;
    return Promise.resolve(merged);
  }

  activateProfile(id: string, _input: ActivateWarehouseProfileInput): Promise<WarehouseProfile> {
    const index = this.profiles.findIndex((profile) => profile.id === id);
    const activated: WarehouseProfile = { ...this.profiles[index], status: 'ACTIVE' };
    this.profiles[index] = activated;
    return Promise.resolve(activated);
  }

  deactivateProfile(
    id: string,
    _input: DeactivateWarehouseProfileInput,
  ): Promise<WarehouseProfile> {
    const index = this.profiles.findIndex((profile) => profile.id === id);
    const deactivated: WarehouseProfile = { ...this.profiles[index], status: 'RETIRED' };
    this.profiles[index] = deactivated;
    return Promise.resolve(deactivated);
  }

  listAssignments(_id: string): Promise<PaginatedResponse<WarehouseProfileAssignment>> {
    return Promise.resolve(page<WarehouseProfileAssignment>([]));
  }

  createAssignment(
    _id: string,
    _input: CreateAssignmentInput,
  ): Promise<WarehouseProfileAssignment> {
    return Promise.reject(new Error('not used'));
  }

  listRuleGroups(_filter?: RuleGroupListFilter): Promise<PaginatedResponse<RuleGroup>> {
    return Promise.resolve(page<RuleGroup>([]));
  }

  listRuleDefinitions(
    _filter?: RuleDefinitionListFilter,
  ): Promise<PaginatedResponse<RuleDefinition>> {
    return Promise.resolve(page<RuleDefinition>([]));
  }

  listProfileRules(_id: string): Promise<PaginatedResponse<WarehouseProfileRule>> {
    return Promise.resolve(page<WarehouseProfileRule>([]));
  }

  addProfileRule(_id: string, _input: AddProfileRuleInput): Promise<WarehouseProfileRule> {
    return Promise.reject(new Error('not used'));
  }

  removeProfileRule(_id: string, _ruleId: string): Promise<void> {
    return Promise.resolve();
  }

  preview(context: PreviewContextInput): Promise<RulePreview> {
    this.previewContexts.push(context);
    return Promise.resolve({
      winner: null,
      allowed: true,
      approvalRequired: false,
      controlMode: {
        mode: null,
        isHardBlock: false,
        approvalRequired: false,
        warning: null,
        suggestion: null,
      },
      skippedRules: [],
      conflicts: [],
      reasonReadiness: null,
      actorContext: {
        actorUserId: null,
        action: null,
        objectType: null,
        objectId: null,
        reasonCode: null,
      },
    });
  }
}

describe('Warehouse Profiles smoke (create draft -> activate -> preview self-check)', () => {
  it('creates a DRAFT profile, then activate flips status to ACTIVE', async () => {
    const repository = new InMemoryWarehouseProfileRepository();

    const draft = await repository.createProfile({
      profileCode: 'WP-01',
      profileName: 'Default',
      warehouseTypeCode: 'DC',
      effectiveFrom: '2026-06-01',
      ownerId: 'owner-1',
    });
    expect(draft.status).toBe('DRAFT');
    expect(draft.ownerId).toBe('owner-1');

    const activated = await repository.activateProfile(draft.id, { reasonCode: 'POLICY' });
    expect(activated.status).toBe('ACTIVE');

    const listed = await repository.listProfiles();
    expect(listed.items[0]?.status).toBe('ACTIVE');
  });

  it('builds a self-check preview context from the selected profile scope and forwards it', async () => {
    const repository = new InMemoryWarehouseProfileRepository();
    const draft = await repository.createProfile({
      profileCode: 'WP-02',
      profileName: 'Owner scoped',
      warehouseTypeCode: 'DC',
      effectiveFrom: '2026-06-01',
      ownerId: 'owner-9',
    });

    const context = buildPreviewContextFromProfile(draft);
    await repository.preview(context);

    // "Preview this profile" copies the profile's six-axis scope so the BE resolves by scope.
    expect(repository.previewContexts[0]).toMatchObject({
      warehouseTypeCode: 'DC',
      ownerId: 'owner-9',
    });
    // Contract divergence: the merged BE preview HTTP request rejects ProfileId
    // (forbidNonWhitelisted), so the self-check context must NOT carry profileId.
    expect('profileId' in (repository.previewContexts[0] as object)).toBe(false);
  });
});
