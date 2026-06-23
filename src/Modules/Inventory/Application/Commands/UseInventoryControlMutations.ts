import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ChangeInventoryStatusInput,
  MoveInventoryInternalInput,
} from '@modules/Inventory/Domain/Types/InventoryControl';
import { inventoryQueryKeys } from '@modules/Inventory/Application/Queries/InventoryQueryKeys';
import { inventoryRepository } from '@modules/Inventory/Infrastructure/Repositories/InventoryRepository';

export function useInventoryControlMutations() {
  const queryClient = useQueryClient();
  const invalidateInventory = () =>
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });

  return {
    changeStatus: useMutation({
      mutationFn: (input: ChangeInventoryStatusInput) => inventoryRepository.changeStatus(input),
      onSuccess: invalidateInventory,
    }),
    moveInternal: useMutation({
      mutationFn: (input: MoveInventoryInternalInput) => inventoryRepository.moveInternal(input),
      onSuccess: invalidateInventory,
    }),
  };
}
