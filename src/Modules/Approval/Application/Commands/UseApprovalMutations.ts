import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import {
  isBlockedError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/Approval/Application/Commands/ApprovalMutationError';
import { approvalQueryKeys } from '@modules/Approval/Application/Queries/ApprovalQueryKeys';
import type { DecideApprovalInput } from '@modules/Approval/Domain/Types/ApprovalTypes';
import { approvalRepository } from '@modules/Approval/Infrastructure/Repositories/ApprovalRepositoryInstance';

export function useApprovalMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });

  // FORBIDDEN (403: self-approval / permission) demotes to read-only; BUSINESS_RULE
  // (already-decided / missing reason / evidence-required) renders inline at the form —
  // neither is toasted. Everything else toasts so the user always gets feedback.
  const notifyHandled = (error: unknown) => {
    if (!isForbiddenError(error) && !isBlockedError(error)) {
      toast.error(toMutationErrorMessage(error));
    }
  };

  // A decision changes the request detail + its position in the queue; refetch exactly that
  // request's detail and the (narrow) requests-list branch.
  const invalidateRequest = (id: string) => {
    void invalidate(approvalQueryKeys.detail(id));
    void invalidate([...approvalQueryKeys.all, 'requests']);
  };

  return {
    approve: useMutation({
      mutationFn: ({ id, input }: { id: string; input: DecideApprovalInput }) =>
        approvalRepository.approve(id, input),
      onSuccess: (_request, variables) => invalidateRequest(variables.id),
      onError: notifyHandled,
    }),
    reject: useMutation({
      mutationFn: ({ id, input }: { id: string; input: DecideApprovalInput }) =>
        approvalRepository.reject(id, input),
      onSuccess: (_request, variables) => invalidateRequest(variables.id),
      onError: notifyHandled,
    }),
  };
}
