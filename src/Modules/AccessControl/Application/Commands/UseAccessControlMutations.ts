import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Sonner';
import {
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { accessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance';

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
