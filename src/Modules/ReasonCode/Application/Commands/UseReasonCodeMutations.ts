import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Sonner';
import {
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/ReasonCode/Application/Commands/ReasonCodeMutationError';
import { reasonCodeQueryKeys } from '@modules/ReasonCode/Application/Queries/ReasonCodeQueryKeys';
import type {
  CreateReasonCodeInput,
  UpdateReasonCodeInput,
} from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';
import { reasonCodeRepository } from '@modules/ReasonCode/Infrastructure/Repositories/ReasonCodeRepositoryInstance';

export function useReasonCodeMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });

  // 409 CONFLICT (dup code) is shown inline at the code field; 403 demotes to read-only.
  // Neither is toasted (single-surface). Everything else toasts.
  const notifyHandled = (error: unknown) => {
    if (!isConflictError(error) && !isForbiddenError(error)) toast.error(toMutationErrorMessage(error));
  };

  const invalidateAll = () => {
    void invalidate([...reasonCodeQueryKeys.all, 'list']);
  };
  const invalidateOne = (id: string) => {
    void invalidate(reasonCodeQueryKeys.detail(id));
    invalidateAll();
  };

  return {
    create: useMutation({
      mutationFn: (input: CreateReasonCodeInput) => reasonCodeRepository.create(input),
      onSuccess: invalidateAll,
      onError: notifyHandled,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateReasonCodeInput }) =>
        reasonCodeRepository.update(id, input),
      onSuccess: (reasonCode) => invalidateOne(reasonCode.id),
      onError: notifyHandled,
    }),
  };
}
