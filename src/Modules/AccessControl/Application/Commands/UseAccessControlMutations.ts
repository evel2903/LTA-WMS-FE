import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import {
  isBadRequestError,
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import {
  accessControlQueryKeys,
  type ReservedRolesState,
} from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
  CreateRoleInput,
  ResetRolePermissionsInput,
  SetRolePermissionsInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { accessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance';

/** Mutation keys for `setRolePermissions`/`resetRolePermissions` — lets `useMutationState`
 * (React Query's mutation-cache query hook) track pending/error state per role/invocation
 * instead of through a single `useMutation()` observer's own reactive fields, which only ever
 * reflect the LATEST call regardless of which role it was for (Review Finding, latest re-review). */
export const ROLE_PERMISSIONS_MUTATION_KEYS = {
  set: ['setRolePermissions'] as const,
  reset: ['resetRolePermissions'] as const,
};

/** Patches the role-detail query cache directly with a PUT/reset response so it's immediately
 * authoritative for THIS role, regardless of which route is on screen or whether this page later
 * unmounts entirely (e.g. back to the roles list and into a detail page again) before some OTHER
 * future refetch would have resolved — a persistent, cache-backed fix, not a component-local one
 * (Review Finding, latest re-review: a component ref cache doesn't survive unmount). Deliberately
 * NOT followed by `invalidateQueries` (see call sites) — the response is already the freshest
 * possible truth, and invalidating would risk a redundant refetch racing/reverting this patch.
 * `id`/`permissionCode` are left as empty-string placeholders (the response only carries
 * `action`/`objectType` pairs, contract §4) — nothing reads them off a role's own grant list, only
 * `buildPermissionMatrix` does, and only via `action`/`objectType`, so this is permanently
 * harmless, not a temporary gap waiting on a refetch to fill in. */
function patchRoleDetailCache(
  queryClient: ReturnType<typeof useQueryClient>,
  roleCode: RoleCode,
  result: { permissions: { action: string; objectType: string }[]; version: number },
) {
  queryClient.setQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(roleCode), (old) => {
    // Two Save/Reset calls for the same role can settle out of order (e.g. network delivery
    // reordering) — never regress the cache to an older result once a newer one has already
    // landed (Review Finding, final verification).
    if (!old || result.version <= old.permissionsVersion) return old;
    return {
      ...old,
      permissions: result.permissions.map((p) => ({
        id: '',
        permissionCode: '',
        action: p.action,
        objectType: p.objectType,
        description: null,
      })),
      permissionsVersion: result.version,
    };
  });
}

// QueryClient owns the cache subscription for its whole lifetime. The WeakSet prevents one
// listener per hook instance without retaining QueryClients after their providers are discarded.
const reservationReconcilers = new WeakSet<QueryClient>();

/** Clear a user's local assignment reservations only after a real effective-permissions fetch
 * succeeds. This deliberately ignores manual `setQueryData` writes and does not rely on Query
 * instance counters/timestamps, so it survives unmount, GC, and a fresh Query reconstruction. */
function ensureAssignmentReservationReconciler(queryClient: QueryClient) {
  if (reservationReconcilers.has(queryClient)) return;
  reservationReconcilers.add(queryClient);

  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type !== 'updated' ||
      event.action.type !== 'success' ||
      event.action.manual
    ) {
      return;
    }

    const effectiveKey = accessControlQueryKeys.userEffective('');
    const queryKey = event.query.queryKey as unknown as readonly unknown[];
    const userId = queryKey[2];
    if (
      queryKey.length !== effectiveKey.length ||
      queryKey[0] !== effectiveKey[0] ||
      queryKey[1] !== effectiveKey[1] ||
      typeof userId !== 'string' ||
      userId.length === 0
    ) {
      return;
    }

    queryClient.setQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles(), (prev) => {
      if (!prev?.[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  });
}

export function useAccessControlMutations() {
  const queryClient = useQueryClient();
  ensureAssignmentReservationReconciler(queryClient);
  // `confirmedRoles()` is a durable app-lifecycle bridge (Review Finding, round 12), not really
  // "fetched" data — it has no observer (only ever read imperatively via `getQueryData` inside
  // `useAllRoles()`'s `select`), so under the app's default 5-minute `gcTime` it would silently
  // evict itself 5 minutes after the FIRST write, undoing the very durability it exists for
  // (Review Finding, round 13). Must be registered before that first write; calling it here —
  // top of every render, before any mutation can fire — guarantees that as cheaply as possible:
  // it's an idempotent Map upsert, safe (and correct, per-QueryClient-instance) to repeat.
  queryClient.setQueryDefaults(accessControlQueryKeys.confirmedRoles(), { gcTime: Infinity });
  // The single local-only reservation entry must outlive page unmounts until a later effective
  // read confirms it. Keeping all user buckets inside this one durable query avoids unbounded
  // query-count growth while preserving cross-user isolation (Review Finding, round 14).
  queryClient.setQueryDefaults(accessControlQueryKeys.reservedRoles(), { gcTime: Infinity });
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });

  // 409 CONFLICT is a distinct INLINE state and 403 FORBIDDEN demotes the panel to
  // read-only (AC3) — neither is toasted (single-surface per error). Everything else toasts.
  const notifyHandled = (error: unknown) => {
    if (!isConflictError(error) && !isForbiddenError(error)) toast.error(toMutationErrorMessage(error));
  };

  // Role/data-scope changes alter the user's effective capability + scope; refetch
  // exactly those narrow branches (no cross-user / cross-module invalidation).
  const invalidateUser = (userId: string) => {
    void invalidate(accessControlQueryKeys.userEffective(userId));
    void invalidate(accessControlQueryKeys.userDataScopes(userId));
  };

  return {
    // 409 (dup code) and 400 (bad role_code format — real BE error is BUSINESS_RULE, not
    // VALIDATION, so this checks HTTP status not code) are inline form states (AC2); 403
    // demotes the "Tạo vai trò" action for subsequent renders — neither toasts. Only an
    // unexpected failure (5xx/network) does.
    createRole: useMutation({
      mutationFn: (input: CreateRoleInput) => accessControlRepository.createRole(input),
      onSuccess: async (role) => {
        // Confirmed roles live in the query cache itself (not a component-local ref) so they
        // survive a route change to a DIFFERENT `useAccessControlMutations()` call site — e.g.
        // Roles Master creating a role, then User Assignment reading the catalog after
        // navigating there. `useAllRoles()`'s own `select` merges this bucket into EVERY read,
        // so a stale/lagged catalog response (read-replica lag, an uncached first fetch, or a
        // refetch that was already in flight) never drops it — no matter which hook instance
        // or how much later that read happens (Review Finding, round 12; supersedes the
        // component-ref + manual cache-patch approach from rounds 4-11).
        const confirmed = queryClient.getQueryData<Role[]>(accessControlQueryKeys.confirmedRoles()) ?? [];
        if (!confirmed.some((existing) => existing.roleCode === role.roleCode)) {
          queryClient.setQueryData<Role[]>(accessControlQueryKeys.confirmedRoles(), [...confirmed, role]);
        }
        void invalidate(accessControlQueryKeys.roles());
        // `roles()` (paginated, RolesMasterPage) and `allRoles()` (full catalog, the
        // assignment-flow dropdown) are two separate cache entries backed by the same
        // endpoint — both must be invalidated, or an already-open assignment flow won't see
        // a just-created custom role until the app-wide 30s staleTime elapses (Review Finding).
        await invalidate(accessControlQueryKeys.allRoles());
        toast.success('Đã tạo vai trò');
      },
      onError: (error) => {
        if (!isConflictError(error) && !isBadRequestError(error) && !isForbiddenError(error)) {
          toast.error(toMutationErrorMessage(error));
        }
      },
    }),
    // 400 (N/A/rider/add-only violation) is an inline form state for RolePermissionEditor, not a
    // toast (mirrors createRole's AC2 pattern); 403 demotes the Save/Reset actions instead.
    setRolePermissions: useMutation({
      mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.set,
      mutationFn: ({ id, input }: { id: string; roleCode: RoleCode; input: SetRolePermissionsInput }) =>
        accessControlRepository.setRolePermissions(id, input),
      // No `invalidate()` here on purpose: the response IS the authoritative fresh state (it's
      // the literal return value of the PUT that just succeeded), so `patchRoleDetailCache`
      // alone keeps the cache correct. Also invalidating would trigger a redundant background
      // refetch that could race the patch and silently revert to older data (e.g. read-replica
      // lag), undermining the very consistency this patch exists for.
      onSuccess: (result, variables) => {
        patchRoleDetailCache(queryClient, variables.roleCode, result);
        toast.success('Đã lưu thay đổi quyền');
      },
      onError: (error) => {
        if (!isBadRequestError(error) && !isForbiddenError(error) && !isConflictError(error)) {
          toast.error(toMutationErrorMessage(error));
        }
      },
    }),
    resetRolePermissions: useMutation({
      mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.reset,
      mutationFn: ({ id, input }: { id: string; roleCode: RoleCode; input: ResetRolePermissionsInput }) =>
        accessControlRepository.resetRolePermissions(id, input),
      // Same rationale as `setRolePermissions` above -- no `invalidate()`, the response is
      // already authoritative and `patchRoleDetailCache` alone keeps the cache correct.
      onSuccess: (result, variables) => {
        patchRoleDetailCache(queryClient, variables.roleCode, result);
        toast.success('Đã khôi phục quyền về mặc định');
      },
      onError: (error) => {
        if (!isBadRequestError(error) && !isForbiddenError(error)) {
          toast.error(toMutationErrorMessage(error));
        }
      },
    }),
    // No cache patch here (unlike `createRole`) — patching `EffectivePermissions.roles` alone
    // once looked like a fix for double-submission (round 6), but it left `.permissions`
    // (and therefore the panel's permission count/list) stale — possibly indefinitely, if the
    // `invalidateUser` refetch below is paused/fails — showing the new role badge next to the
    // WRONG permission list (Review Finding, round 9). Duplicate-submission prevention comes
    // from the global `reservedRoles()` query-cache bucket below — nested under the mutation's
    // OWN `variables.userId`, never under "whichever user this hook instance currently displays"
    // (Review Finding, round 13; supersedes the unkeyed component-`useState` Set from rounds
    // 9-12, which could leak a stale write into a DIFFERENT user's view after navigation, and
    // didn't survive a full page unmount).
    assignRole: useMutation({
      mutationFn: ({ userId, input }: { userId: string; input: AssignRoleInput }) =>
        accessControlRepository.assignRole(userId, input),
      onSuccess: (_void, variables) => {
        // Establish a causal boundary before reserving: an older effective-permissions request
        // may still be in flight after this page unmounts, and inactive invalidation alone does
        // not cancel it. TanStack cancellation prevents that pre-assignment result from
        // dispatching a success that could release the new reservation.
        void queryClient.cancelQueries({
          queryKey: accessControlQueryKeys.userEffective(variables.userId),
          exact: true,
        });
        queryClient.setQueryData<ReservedRolesState>(
          accessControlQueryKeys.reservedRoles(),
          (prev) => ({
            ...prev,
            [variables.userId]: {
              ...prev?.[variables.userId],
              [variables.input.roleCode]: true,
            },
          }),
        );
        invalidateUser(variables.userId);
      },
      onError: notifyHandled,
    }),
    removeRole: useMutation({
      mutationFn: ({ userId, roleCode }: { userId: string; roleCode: RoleCode }) =>
        accessControlRepository.removeRole(userId, roleCode),
      onSuccess: (_void, variables) => {
        queryClient.setQueryData<ReservedRolesState>(
          accessControlQueryKeys.reservedRoles(),
          (prev) => {
            const userReservations = prev?.[variables.userId];
            if (!userReservations || !(variables.roleCode in userReservations)) return prev;
            const nextUserReservations = { ...userReservations };
            delete nextUserReservations[variables.roleCode];
            const next = { ...prev };
            if (Object.keys(nextUserReservations).length === 0) delete next[variables.userId];
            else next[variables.userId] = nextUserReservations;
            return next;
          },
        );
        invalidateUser(variables.userId);
      },
      onError: notifyHandled,
    }),
    assignDataScope: useMutation({
      mutationFn: ({ userId, input }: { userId: string; input: AssignDataScopeInput }) =>
        accessControlRepository.assignDataScope(userId, input),
      onSuccess: (_scope, variables) => invalidateUser(variables.userId),
      onError: notifyHandled,
    }),
    removeDataScope: useMutation({
      mutationFn: ({ userId, scopeId }: { userId: string; scopeId: string }) =>
        accessControlRepository.removeDataScope(userId, scopeId),
      onSuccess: (_void, variables) => invalidateUser(variables.userId),
      onError: notifyHandled,
    }),
  };
}
