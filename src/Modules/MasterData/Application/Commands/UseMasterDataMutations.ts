import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { masterDataQueryKeys } from '@modules/MasterData/Application/Queries/MasterDataQueryKeys';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { CreateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseTypeUseCase';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { UpdateLocationUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationUseCase';
import { UpdateSiteUseCase } from '@modules/MasterData/Application/UseCases/UpdateSiteUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { UpdateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseTypeUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import type {
  CreateLocationInput,
  CreateSiteInput,
  CreateWarehouseInput,
  CreateWarehouseTypeInput,
  CreateZoneInput,
  UpdateLocationInput,
  UpdateSiteInput,
  UpdateWarehouseInput,
  UpdateWarehouseTypeInput,
  UpdateZoneInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';

const createSiteUseCase = new CreateSiteUseCase(masterDataRepository);
const updateSiteUseCase = new UpdateSiteUseCase(masterDataRepository);
const createWarehouseUseCase = new CreateWarehouseUseCase(masterDataRepository);
const updateWarehouseUseCase = new UpdateWarehouseUseCase(masterDataRepository);
const createWarehouseTypeUseCase = new CreateWarehouseTypeUseCase(masterDataRepository);
const updateWarehouseTypeUseCase = new UpdateWarehouseTypeUseCase(masterDataRepository);
const createZoneUseCase = new CreateZoneUseCase(masterDataRepository);
const updateZoneUseCase = new UpdateZoneUseCase(masterDataRepository);
const createLocationUseCase = new CreateLocationUseCase(masterDataRepository);
const updateLocationUseCase = new UpdateLocationUseCase(masterDataRepository);

export function useMasterDataMutations() {
  const queryClient = useQueryClient();
  const invalidateTree = () =>
    queryClient.invalidateQueries({ queryKey: masterDataQueryKeys.siteLocationTree() });
  const invalidateWarehouseTypes = () =>
    queryClient.invalidateQueries({ queryKey: masterDataQueryKeys.warehouseTypesRoot() });
  // Surface failures (validation, 403, 409 duplicate code, network) instead of
  // swallowing them; without this a failed create/update looks like a no-op.
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));
  // Symmetric success feedback — without this, a successful create/update also
  // looks like a no-op (modal just closes, table quietly refreshes).
  const onDone = (invalidate: () => void, message: string) => () => {
    invalidate();
    toast.success(message);
  };

  return {
    createSite: useMutation({
      mutationFn: (input: CreateSiteInput) => createSiteUseCase.execute(input),
      onSuccess: onDone(invalidateTree, 'Đã tạo site'),
      onError: notifyError,
    }),
    updateSite: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateSiteInput }) =>
        updateSiteUseCase.execute(id, input),
      onSuccess: onDone(invalidateTree, 'Đã cập nhật site'),
      onError: notifyError,
    }),
    createWarehouse: useMutation({
      mutationFn: (input: CreateWarehouseInput) => createWarehouseUseCase.execute(input),
      onSuccess: onDone(invalidateTree, 'Đã tạo kho'),
      onError: notifyError,
    }),
    updateWarehouse: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateWarehouseInput }) =>
        updateWarehouseUseCase.execute(id, input),
      onSuccess: onDone(invalidateTree, 'Đã cập nhật kho'),
      onError: notifyError,
    }),
    createWarehouseType: useMutation({
      mutationFn: (input: CreateWarehouseTypeInput) => createWarehouseTypeUseCase.execute(input),
      onSuccess: onDone(invalidateWarehouseTypes, 'Đã tạo loại kho'),
      onError: notifyError,
    }),
    updateWarehouseType: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateWarehouseTypeInput }) =>
        updateWarehouseTypeUseCase.execute(id, input),
      onSuccess: onDone(invalidateWarehouseTypes, 'Đã cập nhật loại kho'),
      onError: notifyError,
    }),
    createZone: useMutation({
      mutationFn: (input: CreateZoneInput) => createZoneUseCase.execute(input),
      onSuccess: onDone(invalidateTree, 'Đã tạo zone'),
      onError: notifyError,
    }),
    updateZone: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateZoneInput }) =>
        updateZoneUseCase.execute(id, input),
      onSuccess: onDone(invalidateTree, 'Đã cập nhật zone'),
      onError: notifyError,
    }),
    createLocation: useMutation({
      mutationFn: (input: CreateLocationInput) => createLocationUseCase.execute(input),
      onSuccess: onDone(invalidateTree, 'Đã tạo vị trí vật lý'),
      onError: notifyError,
    }),
    updateLocation: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateLocationInput }) =>
        updateLocationUseCase.execute(id, input),
      onSuccess: onDone(invalidateTree, 'Đã cập nhật vị trí vật lý'),
      onError: notifyError,
    }),
  };
}
