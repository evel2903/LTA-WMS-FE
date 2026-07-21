import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { inboundPlanQueryKeys } from '@modules/InboundPlan/Application/Queries/InboundPlanQueryKeys';
import { inboundReceivingQueryKeys } from '@modules/InboundReceiving/Application/Queries/InboundReceivingQueryKeys';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateManualReceiptInput,
  EvaluateQcTaskInput,
  RecordQcResultInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';
import { inboundReceivingRepository } from '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance';

// `planId` is threaded through so every mutation's onSuccess can also invalidate the
// InboundPlan module's own cache: receiving actions (esp. startReceivingSession) can
// change the plan's Status/GateInStatus server-side, and the Plan detail page caches
// that plan independently under its own query-key namespace after the module split.
// Review fix: invalidate the whole `inboundPlanQueryKeys.all` namespace (not just this
// plan's `.detail(planId)`) -- the Plan LIST page also renders status/Draft-only row
// actions that go stale otherwise, and `.all` is a strict prefix of both `.detail(id)`
// and `.list(filter)` so this is a superset of the previous, narrower invalidation.
export function useInboundReceivingMutations(planId: string | null) {
  const queryClient = useQueryClient();
  const invalidateInboundReceiving = () => {
    void queryClient.invalidateQueries({ queryKey: inboundReceivingQueryKeys.all });
    if (planId) void queryClient.invalidateQueries({ queryKey: inboundPlanQueryKeys.all });
  };
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  return {
    createManualReceipt: useMutation({
      mutationFn: (input: CreateManualReceiptInput) =>
        inboundReceivingRepository.createManualReceipt(input),
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: inboundReceivingQueryKeys.receiptLists() });
        await queryClient.invalidateQueries({
          queryKey: inboundReceivingQueryKeys.receiptDetail(result.receipt.id),
        });
        await queryClient.invalidateQueries({
          queryKey: inboundReceivingQueryKeys.receiptOperationalState(result.receipt.id),
        });
      },
      onError: notifyError,
    }),
    validateReadiness: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ValidateReceivingReadinessInput }) =>
        inboundReceivingRepository.validateReadiness(id, input),
      onError: notifyError,
    }),
    startReceivingSession: useMutation({
      mutationFn: ({ id, input }: { id: string; input: StartReceivingSessionInput }) =>
        inboundReceivingRepository.startReceivingSession(id, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
    confirmReceiptLine: useMutation({
      mutationFn: ({ receiptId, input }: { receiptId: string; input: ConfirmReceiptLineInput }) =>
        inboundReceivingRepository.confirmReceiptLine(receiptId, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
    confirmInboundLpn: useMutation({
      mutationFn: ({
        receiptId,
        receiptLineId,
        input,
      }: {
        receiptId: string;
        receiptLineId: string;
        input: ConfirmInboundLpnInput;
      }) => inboundReceivingRepository.confirmInboundLpn(receiptId, receiptLineId, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
    releaseInboundToPutaway: useMutation({
      mutationFn: ({
        receiptId,
        receiptLineId,
        input,
      }: {
        receiptId: string;
        receiptLineId: string;
        input: ReleaseInboundToPutawayInput;
      }) => inboundReceivingRepository.releaseInboundToPutaway(receiptId, receiptLineId, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
    captureDiscrepancy: useMutation({
      mutationFn: ({
        receiptId,
        input,
      }: {
        receiptId: string;
        input: CaptureInboundDiscrepancyInput;
      }) => inboundReceivingRepository.captureDiscrepancy(receiptId, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
    evaluateQcTask: useMutation({
      mutationFn: ({ receiptId, input }: { receiptId: string; input: EvaluateQcTaskInput }) =>
        inboundReceivingRepository.evaluateQcTask(receiptId, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
    recordQcResult: useMutation({
      mutationFn: ({ qcTaskId, input }: { qcTaskId: string; input: RecordQcResultInput }) =>
        inboundReceivingRepository.recordQcResult(qcTaskId, input),
      onSuccess: invalidateInboundReceiving,
      onError: notifyError,
    }),
  };
}
