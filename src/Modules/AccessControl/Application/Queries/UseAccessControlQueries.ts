import { useEffect } from 'react';
import { skipToken, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PaginatedResponse } from '@shared/Types/Api';
import {
  accessControlQueryKeys,
  type ReservedRolesState,
} from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { RoleListFilter, UserListFilter } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import {
  mergeRoleDetailSnapshots,
  mergeRoleSnapshots,
} from '@modules/AccessControl/Application/UseCases/MergeRoleSnapshots';
import { accessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance';

export function useAllPermissions() {
  return useQuery({
    queryKey: accessControlQueryKeys.permissions(),
    queryFn: () => accessControlRepository.listAllPermissions(),
  });
}

export function useRoles(filter: RoleListFilter = {}) {
  const queryClient = useQueryClient();
  const queryKey = accessControlQueryKeys.roles(filter);
  return useQuery({
    queryKey,
    queryFn: async () => {
      const fetched = await accessControlRepository.listRoles(filter);
      const cached = queryClient.getQueryData<PaginatedResponse<Role>>(queryKey);
      if (!cached) return fetched;
      const cachedByCode = new Map(cached.items.map((role) => [role.roleCode, role]));
      return {
        ...fetched,
        items: fetched.items.map((role) => mergeRoleSnapshots(cachedByCode.get(role.roleCode), role)),
      };
    },
  });
}

/** Full role catalog (no pagination) — feeds role-name lookups and assignment dropdowns. */
export function useAllRoles() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: accessControlQueryKeys.allRoles(),
    queryFn: () => accessControlRepository.listAllRoles(),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const hasLastKnownGood = query.data !== undefined;
  const isCatalogVerified =
    hasLastKnownGood &&
    query.fetchStatus === 'idle' &&
    !query.isFetching &&
    !query.isError &&
    !query.isStale;
  const isCatalogUnconfirmed = hasLastKnownGood && !isCatalogVerified;
  useEffect(() => {
    if (!isCatalogVerified || !query.data) return;
    queryClient.setQueryData<Role[]>(accessControlQueryKeys.confirmedRoles(), (confirmed) => {
      if (!confirmed?.length) return confirmed;
      const rawCodes = new Set(query.data.map((role) => role.roleCode));
      const remaining = confirmed.filter((role) => !rawCodes.has(role.roleCode));
      return remaining.length === confirmed.length ? confirmed : remaining;
    });
  }, [isCatalogVerified, query.data, query.dataUpdatedAt, queryClient]);
  return { ...query, isCatalogVerified, isCatalogUnconfirmed };
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
        return mergeRoleDetailSnapshots(cached, fetched) ?? fetched;
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

/** Local-only bookkeeping for this user's just-succeeded assignments. All users share one
 * durable cache entry, while `select` exposes only the requested user's bucket. `skipToken`
 * makes it non-fetching, so a broad invalidation cannot replace local writes with an empty
 * query result (Review Finding, round 14). */
const EMPTY_RESERVED_ROLES: Record<string, true> = {};
const EMPTY_RESERVED_ROLES_STATE: ReservedRolesState = {};

export function useReservedRoleCodes(userId: string | null) {
  return useQuery({
    queryKey: accessControlQueryKeys.reservedRoles(),
    queryFn: skipToken,
    initialData: EMPTY_RESERVED_ROLES_STATE,
    select: (reservations) => (userId ? (reservations[userId] ?? EMPTY_RESERVED_ROLES) : EMPTY_RESERVED_ROLES),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
