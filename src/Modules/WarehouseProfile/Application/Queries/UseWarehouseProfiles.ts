import { useQuery } from '@tanstack/react-query';

import { warehouseProfileQueryKeys } from '@modules/WarehouseProfile/Application/Queries/WarehouseProfileQueryKeys';
import type { WarehouseProfileListFilter } from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileQuery';
import { warehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance';

export function useWarehouseProfiles(filter: WarehouseProfileListFilter = {}) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.profiles(filter),
    queryFn: () => warehouseProfileRepository.listProfiles(filter),
  });
}

export function useProfileAssignments(profileId: string | null) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.assignments(profileId ?? ''),
    queryFn: () => warehouseProfileRepository.listAssignments(profileId ?? ''),
    enabled: Boolean(profileId),
  });
}

export function useWarehouseProfileChecklist(profileId: string | null) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.checklist(profileId ?? ''),
    queryFn: () => warehouseProfileRepository.getChecklist(profileId ?? ''),
    enabled: Boolean(profileId),
  });
}

export function useProfileRules(profileId: string | null) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.profileRules(profileId ?? ''),
    queryFn: () => warehouseProfileRepository.listProfileRules(profileId ?? ''),
    enabled: Boolean(profileId),
  });
}
