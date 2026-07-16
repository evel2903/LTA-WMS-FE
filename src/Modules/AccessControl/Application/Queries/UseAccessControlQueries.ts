import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
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
  const queryClient = useQueryClient();
  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: accessControlQueryKeys.roleDetail(roleCode),
      queryFn: async () => {
        const fetched = await accessControlRepository.getRole(roleCode);
        // A GET can be in flight when a Save/Reset succeeds and patches the cache directly
        // (`patchRoleDetailCache`); if this GET's own read happened before that write and its
        // response merely arrives later, applying it would regress the cache to stale
        // grants/version. Never let a GET's result overwrite a newer already-cached one (Review
        // Finding, final verification).
        const cached = queryClient.getQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(roleCode));
        return cached && cached.permissionsVersion > fetched.permissionsVersion ? cached : fetched;
      },
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
