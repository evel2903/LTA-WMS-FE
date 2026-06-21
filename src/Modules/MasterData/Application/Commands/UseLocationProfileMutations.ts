import { useMutation, useQueryClient } from '@tanstack/react-query';

import { masterDataQueryKeys } from '@modules/MasterData/Application/Queries/MasterDataQueryKeys';
import { CreateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationProfileUseCase';
import { UpdateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationProfileUseCase';
import type {
  CreateLocationProfileInput,
  UpdateLocationProfileInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';

export function useLocationProfileMutations() {
  const queryClient = useQueryClient();
  const createLocationProfileUseCase = new CreateLocationProfileUseCase(masterDataRepository);
  const updateLocationProfileUseCase = new UpdateLocationProfileUseCase(masterDataRepository);

  const invalidateProfiles = () =>
    queryClient.invalidateQueries({ queryKey: masterDataQueryKeys.locationProfilesRoot() });
  const invalidateOne = (id: string) => {
    void queryClient.invalidateQueries({ queryKey: masterDataQueryKeys.locationProfile(id) });
    void invalidateProfiles();
  };

  return {
    create: useMutation({
      mutationFn: (input: CreateLocationProfileInput) =>
        createLocationProfileUseCase.execute(input),
      onSuccess: (profile) => invalidateOne(profile.id),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateLocationProfileInput }) =>
        updateLocationProfileUseCase.execute(id, input),
      onSuccess: (profile) => invalidateOne(profile.id),
    }),
  };
}
