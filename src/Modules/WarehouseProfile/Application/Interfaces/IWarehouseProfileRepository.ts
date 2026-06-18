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
  RuleDefinitionListFilter,
  RuleGroupListFilter,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileQuery';

/** The Application port for the warehouse-profile / rule-engine read+write surface (B1-B5). */
export interface IWarehouseProfileRepository {
  // Profiles (B1 + B5)
  listProfiles(filter?: WarehouseProfileListFilter): Promise<PaginatedResponse<WarehouseProfile>>;
  getProfile(id: string): Promise<WarehouseProfile>;
  createProfile(input: CreateWarehouseProfileInput): Promise<WarehouseProfile>;
  updateProfile(id: string, input: UpdateWarehouseProfileInput): Promise<WarehouseProfile>;
  activateProfile(id: string, input: ActivateWarehouseProfileInput): Promise<WarehouseProfile>;
  deactivateProfile(id: string, input: DeactivateWarehouseProfileInput): Promise<WarehouseProfile>;

  // Assignments (B1)
  listAssignments(id: string): Promise<PaginatedResponse<WarehouseProfileAssignment>>;
  createAssignment(id: string, input: CreateAssignmentInput): Promise<WarehouseProfileAssignment>;

  // Rules catalog (B2)
  listRuleGroups(filter?: RuleGroupListFilter): Promise<PaginatedResponse<RuleGroup>>;
  listRuleDefinitions(filter?: RuleDefinitionListFilter): Promise<PaginatedResponse<RuleDefinition>>;

  // Profile-rule assignment (B2)
  listProfileRules(id: string): Promise<PaginatedResponse<WarehouseProfileRule>>;
  addProfileRule(id: string, input: AddProfileRuleInput): Promise<WarehouseProfileRule>;
  removeProfileRule(id: string, ruleId: string): Promise<void>;

  // Preview (B4)
  preview(context: PreviewContextInput): Promise<RulePreview>;
}
