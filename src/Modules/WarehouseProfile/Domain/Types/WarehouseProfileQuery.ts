import type {
  RuleControlMode,
  RuleGroupCatalogState,
  RulePrecedenceTier,
  RuleStatus,
  WarehouseProfileStatus,
} from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

interface PageFilter {
  page?: number;
  pageSize?: number;
}

/** List filter for `GET /warehouse-profiles` (B1 whitelisted set). */
export interface WarehouseProfileListFilter extends PageFilter {
  status?: WarehouseProfileStatus;
  warehouseTypeCode?: string;
  warehouseId?: string;
}

/** List filter for `GET /rule-definitions` (B2 whitelisted set). */
export interface RuleDefinitionListFilter extends PageFilter {
  ruleGroupId?: string;
  precedenceTier?: RulePrecedenceTier;
  controlMode?: RuleControlMode;
  status?: RuleStatus;
  warehouseTypeCode?: string;
  warehouseId?: string;
}

/** List filter for `GET /rule-groups` (B2 whitelisted set). */
export interface RuleGroupListFilter extends PageFilter {
  catalogState?: RuleGroupCatalogState;
}
