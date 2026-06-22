import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { inboundQueryKeys } from '@modules/Inbound/Application/Queries/InboundQueryKeys';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  RecordGateInInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';
import { inboundRepository } from '@modules/Inbound/Infrastructure/Repositories/InboundRepositoryInstance';

export function useInboundMutations() {
  const queryClient = useQueryClient();
  const invalidateInbound = () => queryClient.invalidateQueries({ queryKey: inboundQueryKeys.all });
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  return {
    createInboundPlan: useMutation({
      mutationFn: (input: CreateInboundPlanInput) => inboundRepository.create(input),
      onSuccess: invalidateInbound,
      onError: notifyError,
    }),
    recordGateIn: useMutation({
      mutationFn: ({ id, input }: { id: string; input: RecordGateInInput }) =>
        inboundRepository.recordGateIn(id, input),
      onSuccess: invalidateInbound,
      onError: notifyError,
    }),
    validateReadiness: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ValidateReceivingReadinessInput }) =>
        inboundRepository.validateReadiness(id, input),
      onError: notifyError,
    }),
    startReceivingSession: useMutation({
      mutationFn: ({ id, input }: { id: string; input: StartReceivingSessionInput }) =>
        inboundRepository.startReceivingSession(id, input),
      onSuccess: invalidateInbound,
      onError: notifyError,
    }),
    confirmReceiptLine: useMutation({
      mutationFn: ({ receiptId, input }: { receiptId: string; input: ConfirmReceiptLineInput }) =>
        inboundRepository.confirmReceiptLine(receiptId, input),
      onSuccess: invalidateInbound,
      onError: notifyError,
    }),
    captureDiscrepancy: useMutation({
      mutationFn: ({
        receiptId,
        input,
      }: {
        receiptId: string;
        input: CaptureInboundDiscrepancyInput;
      }) => inboundRepository.captureDiscrepancy(receiptId, input),
      onSuccess: invalidateInbound,
      onError: notifyError,
    }),
  };
}
