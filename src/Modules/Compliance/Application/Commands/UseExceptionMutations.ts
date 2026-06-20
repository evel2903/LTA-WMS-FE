import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Sonner';
import {
  isBlockedError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/Compliance/Application/Commands/ComplianceMutationError';
import { complianceQueryKeys } from '@modules/Compliance/Application/Queries/ComplianceQueryKeys';
import type {
  AssignExceptionInput,
  LogExceptionInput,
  ResolveExceptionInput,
  SubmitExceptionInput,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';
import { complianceRepository } from '@modules/Compliance/Infrastructure/Repositories/ComplianceRepositoryInstance';

export function useExceptionMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });

  // FORBIDDEN (403) demotes to read-only and BUSINESS_RULE (lifecycle-blocked / illegal
  // transition) renders inline at the action — neither is toasted. Everything else
  // (incl. any 409) toasts so the user always gets feedback.
  const notifyHandled = (error: unknown) => {
    if (!isForbiddenError(error) && !isBlockedError(error)) {
      toast.error(toMutationErrorMessage(error));
    }
  };

  // A transition changes the case detail + its position in the queue; refetch exactly
  // that case's detail and the (narrow) exceptions-list branch.
  const invalidateCase = (id: string) => {
    void invalidate(complianceQueryKeys.exceptionDetail(id));
    void invalidate([...complianceQueryKeys.all, 'exceptions']);
  };

  return {
    logException: useMutation({
      mutationFn: ({ id, input }: { id: string; input: LogExceptionInput }) =>
        complianceRepository.logException(id, input),
      onSuccess: (_case, variables) => invalidateCase(variables.id),
      onError: notifyHandled,
    }),
    assignException: useMutation({
      mutationFn: ({ id, input }: { id: string; input: AssignExceptionInput }) =>
        complianceRepository.assignException(id, input),
      onSuccess: (_case, variables) => invalidateCase(variables.id),
      onError: notifyHandled,
    }),
    submitException: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SubmitExceptionInput }) =>
        complianceRepository.submitException(id, input),
      onSuccess: (_case, variables) => invalidateCase(variables.id),
      onError: notifyHandled,
    }),
    resolveException: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ResolveExceptionInput }) =>
        complianceRepository.resolveException(id, input),
      onSuccess: (_case, variables) => invalidateCase(variables.id),
      onError: notifyHandled,
    }),
    closeException: useMutation({
      mutationFn: ({ id }: { id: string }) => complianceRepository.closeException(id),
      onSuccess: (_case, variables) => invalidateCase(variables.id),
      onError: notifyHandled,
    }),
  };
}
