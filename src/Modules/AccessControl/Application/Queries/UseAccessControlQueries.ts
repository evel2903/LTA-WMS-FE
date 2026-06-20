import { useQueries, useQuery } from '@tanstack/react-query';

import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import { CORE_ROLE_CODES } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { UserListFilter } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { accessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance';

export function useAllPermissions() {
  return useQuery({
    queryKey: accessControlQueryKeys.permissions(),
    queryFn: () => accessControlRepository.listAllPermissions(),
  });
}

/** One detail query per core role (parallel) — supplies the matrix grant cells. */
export function useRoleDetails() {
  return useQueries({
    queries: CORE_ROLE_CODES.map((roleCode) => ({
      queryKey: accessControlQueryKeys.roleDetail(roleCode),
      queryFn: () => accessControlRepository.getRole(roleCode),
    })),
  });
}

export function useUsers(filter: UserListFilter = {}) {
  return useQuery({
    queryKey: accessControlQueryKeys.users(filter),
    queryFn: () => accessControlRepository.listUsers(filter),
  });
}

export function useUserEffectivePermissions(userId: string | null) {
  return useQuery({
    queryKey: accessControlQueryKeys.userEffective(userId ?? ''),
    queryFn: () => accessControlRepository.getUserEffectivePermissions(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useUserDataScopes(userId: string | null) {
  return useQuery({
    queryKey: accessControlQueryKeys.userDataScopes(userId ?? ''),
    queryFn: () => accessControlRepository.listUserDataScopes(userId ?? ''),
    enabled: Boolean(userId),
  });
}
