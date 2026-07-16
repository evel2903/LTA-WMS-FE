import { useQueries, useQuery } from '@tanstack/react-query';

import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { RoleListFilter, UserListFilter } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { accessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance';

export function useAllPermissions() {
  return useQuery({
    queryKey: accessControlQueryKeys.permissions(),
    queryFn: () => accessControlRepository.listAllPermissions(),
  });
}

export function useRoles(filter: RoleListFilter = {}) {
  return useQuery({
    queryKey: accessControlQueryKeys.roles(filter),
    queryFn: () => accessControlRepository.listRoles(filter),
  });
}

/** One detail query per given role code (parallel) — supplies matrix grant cells / permission counts. */
export function useRoleDetails(roleCodes: RoleCode[]) {
  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: accessControlQueryKeys.roleDetail(roleCode),
      queryFn: () => accessControlRepository.getRole(roleCode),
    })),
  });
}

/** Single-role detail — thin wrapper over `useRoleDetails` for the role-detail/editor page. */
export function useRoleDetail(roleCode: RoleCode) {
  return useRoleDetails([roleCode])[0];
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
