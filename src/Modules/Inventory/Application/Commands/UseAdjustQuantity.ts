import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AdjustQuantityInput } from '@modules/Inventory/Domain/Types/InventoryQuery';
import { AdjustInventoryQuantityUseCase } from '@modules/Inventory/Application/UseCases/AdjustInventoryQuantityUseCase';
import { inventoryQueryKeys } from '@modules/Inventory/Application/Queries/InventoryQueryKeys';
import { inventoryRepository } from '@modules/Inventory/Infrastructure/Repositories/InventoryRepository';

const adjustQuantityUseCase = new AdjustInventoryQuantityUseCase(inventoryRepository);

/**
 * Command hook (write). On success it seeds the detail cache and invalidates
 * the lists so the table reflects the new quantity without a manual refetch.
 */
export function useAdjustQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdjustQuantityInput) => adjustQuantityUseCase.execute(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(inventoryQueryKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lists() });
    },
  });
}
