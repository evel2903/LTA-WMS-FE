import { useQuery } from '@tanstack/react-query';

import { warehouseProfileQueryKeys } from '@modules/WarehouseProfile/Application/Queries/WarehouseProfileQueryKeys';
import type {
  RuleDefinitionListFilter,
  RuleGroupListFilter,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileQuery';
import { warehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance';

export function useRuleGroups(filter: RuleGroupListFilter = {}) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.ruleGroups(filter),
    queryFn: () => warehouseProfileRepository.listRuleGroups(filter),
  });
}

export function useRuleDefinitions(filter: RuleDefinitionListFilter = {}) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.ruleDefinitions(filter),
    queryFn: () => warehouseProfileRepository.listRuleDefinitions(filter),
  });
}
