import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import {
  isForbiddenError,
  isInlineError,
  toMutationErrorMessage,
} from '@modules/InventoryStatus/Application/Commands/InventoryStatusMutationError';
import { inventoryStatusQueryKeys } from '@modules/InventoryStatus/Application/Queries/InventoryStatusQueryKeys';
import type { UpdateInventoryStatusInput } from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';
import { inventoryStatusRepository } from '@modules/InventoryStatus/Infrastructure/Repositories/InventoryStatusRepositoryInstance';

export function useInventoryStatusMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });

  // 403 demotes to read-only; reason/validation/conflict show inline at the form. None of
  // those are toasted (single-surface). Everything else toasts.
  const notifyHandled = (error: unknown) => {
    if (!isForbiddenError(error) && !isInlineError(error)) toast.error(toMutationErrorMessage(error));
  };

  const invalidateOne = (id: string) => {
    void invalidate(inventoryStatusQueryKeys.detail(id));
    void invalidate([...inventoryStatusQueryKeys.all, 'list']);
  };

  return {
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateInventoryStatusInput }) =>
        inventoryStatusRepository.update(id, input),
      onSuccess: (status) => invalidateOne(status.id),
      onError: notifyHandled,
    }),
  };
}
