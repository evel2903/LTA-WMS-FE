import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { inventorySerialLookupQueryKeys } from '@modules/InventoryLookup/Application/Queries/InventorySerialLookupQueryKeys';
import type { InventorySerialCorrectionRequest } from '@modules/InventoryLookup/Domain/Types/InventorySerialCorrectionRequest';
import { inventorySerialLookupRepository } from '@modules/InventoryLookup/Infrastructure/Repositories/InventorySerialLookupRepositoryInstance';

export function useCorrectSerialNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: InventorySerialCorrectionRequest) => inventorySerialLookupRepository.correct(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventorySerialLookupQueryKeys.all }),
    onError: (error) => toast.error(toMutationErrorMessage(error)),
  });
}
