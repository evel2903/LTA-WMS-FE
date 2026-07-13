import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { catalogQueryKeys } from '@modules/MasterData/Application/Queries/CatalogQueryKeys';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreatePackDefinitionInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  UpdateItemCoverageInput,
  UpdateOwnerInput,
  UpdatePackDefinitionInput,
  UpdateSkuBarcodeInput,
  UpdateSkuInput,
  UpdateUomConversionInput,
  UpdateUomInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import { catalogRepository } from '@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance';

export function useCatalogMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) =>
    queryClient.invalidateQueries({ queryKey: key });
  // Surface failures (validation, 403, 409 duplicate code, network) via toast.
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));
  // Symmetric success feedback — without this, a successful create/update also
  // looks like a no-op (modal just closes, table quietly refreshes).
  const onDone = (invalidate: () => void, message: string) => () => {
    invalidate();
    toast.success(message);
  };

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
      onSuccess: onDone(invalidateOwners, 'Đã tạo chủ hàng'),
      onError: notifyError,
    }),
    updateOwner: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateOwnerInput }) =>
        catalogRepository.updateOwner(id, input),
      onSuccess: onDone(invalidateOwners, 'Đã cập nhật chủ hàng'),
      onError: notifyError,
    }),
    createUom: useMutation({
      mutationFn: (input: CreateUomInput) => catalogRepository.createUom(input),
      onSuccess: onDone(invalidateUoms, 'Đã tạo đơn vị tính'),
      onError: notifyError,
    }),
    updateUom: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateUomInput }) =>
        catalogRepository.updateUom(id, input),
      onSuccess: onDone(invalidateUoms, 'Đã cập nhật đơn vị tính'),
      onError: notifyError,
    }),
    createSku: useMutation({
      mutationFn: (input: CreateSkuInput) => catalogRepository.createSku(input),
      onSuccess: onDone(invalidateSkus, 'Đã tạo SKU'),
      onError: notifyError,
    }),
    updateSku: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateSkuInput }) =>
        catalogRepository.updateSku(id, input),
      onSuccess: onDone(invalidateSkus, 'Đã cập nhật SKU'),
      onError: notifyError,
    }),
    createSkuBarcode: useMutation({
      mutationFn: (input: CreateSkuBarcodeInput) => catalogRepository.createSkuBarcode(input),
      onSuccess: onDone(invalidateRelations, 'Đã tạo mã vạch'),
      onError: notifyError,
    }),
    updateSkuBarcode: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateSkuBarcodeInput }) =>
        catalogRepository.updateSkuBarcode(id, input),
      onSuccess: onDone(invalidateRelations, 'Đã cập nhật mã vạch'),
      onError: notifyError,
    }),
    createPackDefinition: useMutation({
      mutationFn: (input: CreatePackDefinitionInput) =>
        catalogRepository.createPackDefinition(input),
      onSuccess: onDone(invalidateRelations, 'Đã tạo quy cách đóng gói'),
      onError: notifyError,
    }),
    updatePackDefinition: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdatePackDefinitionInput }) =>
        catalogRepository.updatePackDefinition(id, input),
      onSuccess: onDone(invalidateRelations, 'Đã cập nhật quy cách đóng gói'),
      onError: notifyError,
    }),
    createUomConversion: useMutation({
      mutationFn: (input: CreateUomConversionInput) =>
        catalogRepository.createUomConversion(input),
      onSuccess: onDone(invalidateRelations, 'Đã tạo quy đổi đơn vị tính'),
      onError: notifyError,
    }),
    updateUomConversion: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateUomConversionInput }) =>
        catalogRepository.updateUomConversion(id, input),
      onSuccess: onDone(invalidateRelations, 'Đã cập nhật quy đổi đơn vị tính'),
      onError: notifyError,
    }),
    createItemCoverage: useMutation({
      mutationFn: (input: CreateItemCoverageInput) => catalogRepository.createItemCoverage(input),
      onSuccess: onDone(invalidateRelations, 'Đã tạo phạm vi hàng hóa'),
      onError: notifyError,
    }),
    updateItemCoverage: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateItemCoverageInput }) =>
        catalogRepository.updateItemCoverage(id, input),
      onSuccess: onDone(invalidateRelations, 'Đã cập nhật phạm vi hàng hóa'),
      onError: notifyError,
    }),
  };
}
