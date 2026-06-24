import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shippingQueryKeys } from '@modules/Shipping/Application/Queries/ShippingQueryKeys';
import type {
  AssignDockInput,
  AssignTruckInput,
  StagePackageInput,
} from '@modules/Shipping/Domain/Types/ShippingQuery';
import { shippingRepository } from '@modules/Shipping/Infrastructure/Repositories/ShippingRepositoryInstance';

export function useShippingMutations() {
  const queryClient = useQueryClient();
  const invalidateShipping = () => queryClient.invalidateQueries({ queryKey: shippingQueryKeys.all });

  return {
    stagePackage: useMutation({
      mutationFn: (input: StagePackageInput) => shippingRepository.stagePackage(input),
      onSuccess: invalidateShipping,
    }),
    assignDock: useMutation({
      mutationFn: (input: { id: string; payload: AssignDockInput }) =>
        shippingRepository.assignDock(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
    assignTruck: useMutation({
      mutationFn: (input: { id: string; payload: AssignTruckInput }) =>
        shippingRepository.assignTruck(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
  };
}

