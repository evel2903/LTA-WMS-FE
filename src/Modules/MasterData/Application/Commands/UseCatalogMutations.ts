import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Sonner';
import { catalogQueryKeys } from '@modules/MasterData/Application/Queries/CatalogQueryKeys';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  UpdateOwnerInput,
  UpdateSkuInput,
  UpdateUomInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import { catalogRepository } from '@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance';

export function useCatalogMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) =>
    queryClient.invalidateQueries({ queryKey: key });
  // Surface failures (validation, 403, 409 duplicate code, network) via toast.
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  // Narrow each invalidation to its own sub-namespace. `catalogQueryKeys.all`
  // is the shared `['masterData']` root, so invalidating it would also refetch
  // the A7 Site/Location tree under the same namespace.
  const invalidateOwners = () => invalidate([...catalogQueryKeys.all, 'owners']);
  const invalidateUoms = () => invalidate([...catalogQueryKeys.all, 'uoms']);
  const invalidateSkus = () => invalidate([...catalogQueryKeys.all, 'skus']);
  const invalidateRelations = () => invalidate([...catalogQueryKeys.all, 'skuRelations']);

  return {
    createOwner: useMutation({
      mutationFn: (input: CreateOwnerInput) => catalogRepository.createOwner(input),
      onSuccess: invalidateOwners,
      onError: notifyError,
    }),
    updateOwner: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateOwnerInput }) =>
        catalogRepository.updateOwner(id, input),
      onSuccess: invalidateOwners,
      onError: notifyError,
    }),
    createUom: useMutation({
      mutationFn: (input: CreateUomInput) => catalogRepository.createUom(input),
      onSuccess: invalidateUoms,
      onError: notifyError,
    }),
    updateUom: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateUomInput }) =>
        catalogRepository.updateUom(id, input),
      onSuccess: invalidateUoms,
      onError: notifyError,
    }),
    createSku: useMutation({
      mutationFn: (input: CreateSkuInput) => catalogRepository.createSku(input),
      onSuccess: invalidateSkus,
      onError: notifyError,
    }),
    updateSku: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateSkuInput }) =>
        catalogRepository.updateSku(id, input),
      onSuccess: invalidateSkus,
      onError: notifyError,
    }),
    createSkuBarcode: useMutation({
      mutationFn: (input: CreateSkuBarcodeInput) => catalogRepository.createSkuBarcode(input),
      onSuccess: invalidateRelations,
      onError: notifyError,
    }),
    createUomConversion: useMutation({
      mutationFn: (input: CreateUomConversionInput) =>
        catalogRepository.createUomConversion(input),
      onSuccess: invalidateRelations,
      onError: notifyError,
    }),
    createItemCoverage: useMutation({
      mutationFn: (input: CreateItemCoverageInput) => catalogRepository.createItemCoverage(input),
      onSuccess: invalidateRelations,
      onError: notifyError,
    }),
  };
}
