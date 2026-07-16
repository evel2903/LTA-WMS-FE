import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import {
  isBadRequestError,
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
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

export function useAccessControlMutations() {
  const queryClient = useQueryClient();
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
      onSuccess: () => {
        void invalidate(accessControlQueryKeys.roles());
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
    assignRole: useMutation({
      mutationFn: ({ userId, input }: { userId: string; input: AssignRoleInput }) =>
        accessControlRepository.assignRole(userId, input),
      onSuccess: (_void, variables) => invalidateUser(variables.userId),
      onError: notifyHandled,
    }),
    removeRole: useMutation({
      mutationFn: ({ userId, roleCode }: { userId: string; roleCode: RoleCode }) =>
        accessControlRepository.removeRole(userId, roleCode),
      onSuccess: (_void, variables) => invalidateUser(variables.userId),
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
