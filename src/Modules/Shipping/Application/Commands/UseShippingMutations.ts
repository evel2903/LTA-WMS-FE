import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shippingQueryKeys } from '@modules/Shipping/Application/Queries/ShippingQueryKeys';
import type {
  AssignDockInput,
  AssignTruckInput,
  ConfirmShipmentInput,
  EvaluateGoodsIssueTriggerInput,
  PostGoodsIssueInput,
  RecordGateOutInput,
  ScanLoadingInput,
  StagePackageInput,
} from '@modules/Shipping/Domain/Types/ShippingQuery';
import { shippingRepository } from '@modules/Shipping/Infrastructure/Repositories/ShippingRepositoryInstance';

export function useShippingMutations() {
  const queryClient = useQueryClient();
  const invalidateShipping = () =>
    queryClient.invalidateQueries({ queryKey: shippingQueryKeys.all });

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
    scanLoading: useMutation({
      mutationFn: (input: { id: string; payload: ScanLoadingInput }) =>
        shippingRepository.scanLoading(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
    confirmShipment: useMutation({
      mutationFn: (input: { id: string; payload: ConfirmShipmentInput }) =>
        shippingRepository.confirmShipment(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
    recordGateOut: useMutation({
      mutationFn: (input: { id: string; payload: RecordGateOutInput }) =>
        shippingRepository.recordGateOut(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
    evaluateGoodsIssueTrigger: useMutation({
      mutationFn: (input: { id: string; payload: EvaluateGoodsIssueTriggerInput }) =>
        shippingRepository.evaluateGoodsIssueTrigger(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
    postGoodsIssue: useMutation({
      mutationFn: (input: { id: string; payload: PostGoodsIssueInput }) =>
        shippingRepository.postGoodsIssue(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateShipping();
        void queryClient.invalidateQueries({ queryKey: shippingQueryKeys.detail(input.id) });
      },
    }),
  };
}
