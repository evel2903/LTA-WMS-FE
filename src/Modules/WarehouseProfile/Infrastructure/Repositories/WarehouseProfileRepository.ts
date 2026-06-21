import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WAREHOUSE_PROFILE_DEFAULT_PAGE_SIZE } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
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
import { WAREHOUSE_PROFILE_ENDPOINTS } from '@modules/WarehouseProfile/Infrastructure/Api/WarehouseProfileEndpoints';
import type {
  PagedWarehouseProfileDto,
  RuleDefinitionDto,
  RuleGroupDto,
  RulePreviewResultDto,
  WarehouseProfileChecklistDto,
  WarehouseProfileAssignmentDto,
  WarehouseProfileDto,
  WarehouseProfileRuleDto,
} from '@modules/WarehouseProfile/Infrastructure/Dtos/WarehouseProfileDtos';
import { WarehouseProfileMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/WarehouseProfileMapper';

function paging(filter: { page?: number; pageSize?: number } = {}) {
  return {
    Page: filter.page ?? 1,
    PageSize: filter.pageSize ?? WAREHOUSE_PROFILE_DEFAULT_PAGE_SIZE,
  };
}

/** The single place that touches `httpClient` for the warehouse-profile surface. */
export class WarehouseProfileRepository implements IWarehouseProfileRepository {
  constructor(private readonly http: HttpClient) {}

  async listProfiles(
    filter: WarehouseProfileListFilter = {},
  ): Promise<PaginatedResponse<WarehouseProfile>> {
    const dto = await this.http.get<PagedWarehouseProfileDto<WarehouseProfileDto>>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILES,
      {
        params: {
          ...paging(filter),
          Status: filter.status,
          WarehouseTypeCode: filter.warehouseTypeCode,
          WarehouseId: filter.warehouseId,
        },
      },
    );
    return WarehouseProfileMapper.toPaged(dto, (item) => WarehouseProfileMapper.toProfile(item));
  }

  async getProfile(id: string): Promise<WarehouseProfile> {
    const dto = await this.http.get<WarehouseProfileDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_BY_ID(id),
    );
    return WarehouseProfileMapper.toProfile(dto);
  }

  async getChecklist(id: string): Promise<WarehouseProfileChecklist> {
    const dto = await this.http.get<WarehouseProfileChecklistDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_CHECKLIST(id),
    );
    return WarehouseProfileMapper.toChecklist(dto);
  }

  async createProfile(input: CreateWarehouseProfileInput): Promise<WarehouseProfile> {
    const dto = await this.http.post<WarehouseProfileDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILES,
      WarehouseProfileMapper.toCreateProfileRequest(input),
    );
    return WarehouseProfileMapper.toProfile(dto);
  }

  async updateProfile(id: string, input: UpdateWarehouseProfileInput): Promise<WarehouseProfile> {
    const dto = await this.http.patch<WarehouseProfileDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_BY_ID(id),
      WarehouseProfileMapper.toUpdateProfileRequest(input),
    );
    return WarehouseProfileMapper.toProfile(dto);
  }

  async activateProfile(
    id: string,
    input: ActivateWarehouseProfileInput,
  ): Promise<WarehouseProfile> {
    const dto = await this.http.post<WarehouseProfileDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_ACTIVATE(id),
      WarehouseProfileMapper.toActivateRequest(input),
    );
    return WarehouseProfileMapper.toProfile(dto);
  }

  async deactivateProfile(
    id: string,
    input: DeactivateWarehouseProfileInput,
  ): Promise<WarehouseProfile> {
    const dto = await this.http.post<WarehouseProfileDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_DEACTIVATE(id),
      WarehouseProfileMapper.toDeactivateRequest(input),
    );
    return WarehouseProfileMapper.toProfile(dto);
  }

  async listAssignments(id: string): Promise<PaginatedResponse<WarehouseProfileAssignment>> {
    const dto = await this.http.get<PagedWarehouseProfileDto<WarehouseProfileAssignmentDto>>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_ASSIGNMENTS(id),
    );
    return WarehouseProfileMapper.toPaged(dto, (item) => WarehouseProfileMapper.toAssignment(item));
  }

  async createAssignment(
    id: string,
    input: CreateAssignmentInput,
  ): Promise<WarehouseProfileAssignment> {
    const dto = await this.http.post<WarehouseProfileAssignmentDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_ASSIGNMENTS(id),
      WarehouseProfileMapper.toCreateAssignmentRequest(input),
    );
    return WarehouseProfileMapper.toAssignment(dto);
  }

  async listRuleGroups(filter: RuleGroupListFilter = {}): Promise<PaginatedResponse<RuleGroup>> {
    const dto = await this.http.get<PagedWarehouseProfileDto<RuleGroupDto>>(
      WAREHOUSE_PROFILE_ENDPOINTS.RULE_GROUPS,
      { params: { ...paging(filter), CatalogState: filter.catalogState } },
    );
    return WarehouseProfileMapper.toPaged(dto, (item) => WarehouseProfileMapper.toRuleGroup(item));
  }

  async listRuleDefinitions(
    filter: RuleDefinitionListFilter = {},
  ): Promise<PaginatedResponse<RuleDefinition>> {
    const dto = await this.http.get<PagedWarehouseProfileDto<RuleDefinitionDto>>(
      WAREHOUSE_PROFILE_ENDPOINTS.RULE_DEFINITIONS,
      {
        params: {
          ...paging(filter),
          RuleGroupId: filter.ruleGroupId,
          PrecedenceTier: filter.precedenceTier,
          ControlMode: filter.controlMode,
          Status: filter.status,
          WarehouseTypeCode: filter.warehouseTypeCode,
          WarehouseId: filter.warehouseId,
        },
      },
    );
    return WarehouseProfileMapper.toPaged(dto, (item) =>
      WarehouseProfileMapper.toRuleDefinition(item),
    );
  }

  async listProfileRules(id: string): Promise<PaginatedResponse<WarehouseProfileRule>> {
    const dto = await this.http.get<PagedWarehouseProfileDto<WarehouseProfileRuleDto>>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_RULES(id),
    );
    return WarehouseProfileMapper.toPaged(dto, (item) =>
      WarehouseProfileMapper.toProfileRule(item),
    );
  }

  async addProfileRule(id: string, input: AddProfileRuleInput): Promise<WarehouseProfileRule> {
    const dto = await this.http.post<WarehouseProfileRuleDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_RULES(id),
      WarehouseProfileMapper.toAddProfileRuleRequest(input),
    );
    return WarehouseProfileMapper.toProfileRule(dto);
  }

  async removeProfileRule(id: string, ruleId: string): Promise<void> {
    await this.http.delete<void>(WAREHOUSE_PROFILE_ENDPOINTS.PROFILE_RULE_BY_ID(id, ruleId));
  }

  async preview(context: PreviewContextInput): Promise<RulePreview> {
    const dto = await this.http.post<RulePreviewResultDto>(
      WAREHOUSE_PROFILE_ENDPOINTS.RULES_PREVIEW,
      WarehouseProfileMapper.toPreviewRequest(context),
    );
    return WarehouseProfileMapper.toPreview(dto);
  }
}
