import { useEffect } from 'react';
import { skipToken, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  accessControlQueryKeys,
  type ReservedRolesState,
} from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
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

/** Full role catalog (no pagination) — feeds role-name lookups and assignment dropdowns. */
export function useAllRoles() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: accessControlQueryKeys.allRoles(),
    queryFn: () => accessControlRepository.listAllRoles(),
    // Merges in server-confirmed creations on every read, regardless of which
    // `useAccessControlMutations()` instance created them or whether this raw catalog
    // response is itself stale (e.g. read-replica lag) -- fixes a confirmed role
    // disappearing after navigating from Roles Master to User Assignment (Review Finding,
    // round 12).
    select: (roles) => {
      const confirmed = queryClient.getQueryData<Role[]>(accessControlQueryKeys.confirmedRoles()) ?? [];
      const missing = confirmed.filter((c) => !roles.some((r) => r.roleCode === c.roleCode));
      return missing.length === 0 ? roles : [...roles, ...missing];
    },
  });
  useEffect(() => {
    // Prunes a role from the confirmed-roles bridge once the RAW (pre-merge) catalog already
    // contains it -- the bridge only needs to survive until an authoritative read catches up;
    // otherwise it grows unboundedly for the rest of the session (Review Finding, round 13).
    // Reads the raw cache directly (not `query.data`, already select-merged) and writes from a
    // `useEffect`, not from `select` itself -- `select` can be invoked more than once per render
    // for memoization and must stay a pure, cache-mutation-free function.
    const raw = queryClient.getQueryData<Role[]>(accessControlQueryKeys.allRoles());
    if (!raw) return;
    queryClient.setQueryData<Role[]>(accessControlQueryKeys.confirmedRoles(), (confirmed) => {
      if (!confirmed || confirmed.length === 0) return confirmed;
      const stillNeeded = confirmed.filter((c) => !raw.some((r) => r.roleCode === c.roleCode));
      return stillNeeded.length === confirmed.length ? confirmed : stillNeeded;
    });
  }, [query.dataUpdatedAt, queryClient]);
  return query;
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
