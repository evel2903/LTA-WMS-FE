import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  RuleDefinitionListFilter,
  RuleGroupListFilter,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileQuery';

export const warehouseProfileQueryKeys = {
  all: [QUERY_NAMESPACES.WAREHOUSE_PROFILE] as const,
  profiles: (filter?: WarehouseProfileListFilter) =>
    [...warehouseProfileQueryKeys.all, 'profiles', filter ?? {}] as const,
  profileDetail: (id: string) => [...warehouseProfileQueryKeys.all, 'profile', id] as const,
  assignments: (id: string) => [...warehouseProfileQueryKeys.all, 'assignments', id] as const,
  profileRules: (id: string) => [...warehouseProfileQueryKeys.all, 'profileRules', id] as const,
  ruleGroups: (filter?: RuleGroupListFilter) =>
    [...warehouseProfileQueryKeys.all, 'ruleGroups', filter ?? {}] as const,
  ruleDefinitions: (filter?: RuleDefinitionListFilter) =>
    [...warehouseProfileQueryKeys.all, 'ruleDefinitions', filter ?? {}] as const,
};
