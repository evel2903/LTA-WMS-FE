import type {
  InboundDiscrepancy,
  InboundLpn,
  InboundOperationalState,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  Receipt,
  ReceiptLine,
  ReceiptOperationalState,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/InboundReceiving/Domain/Types/Receipt';
import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateManualReceiptInput,
  EvaluateQcTaskInput,
  RecordQcResultInput,
  ReleaseInboundToPutawayInput,
  ReceiptListFilter,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';

export interface IInboundReceivingRepository {
  listReceipts(filter?: ReceiptListFilter): Promise<PaginatedResponse<Receipt>>;
  getReceipt(receiptId: string): Promise<Receipt>;
  getReceiptOperationalState(receiptId: string): Promise<ReceiptOperationalState>;
  createManualReceipt(
    input: CreateManualReceiptInput,
  ): Promise<{ receipt: Receipt; session: ReceivingSession; isDuplicate: boolean }>;
  getOperationalState(planId: string): Promise<InboundOperationalState>;
  validateReadiness(
    planId: string,
    input?: ValidateReceivingReadinessInput,
  ): Promise<ReceivingReadiness>;
  startReceivingSession(
    planId: string,
    input?: StartReceivingSessionInput,
  ): Promise<ReceivingSession>;
  confirmReceiptLine(receiptId: string, input: ConfirmReceiptLineInput): Promise<ReceiptLine>;
  confirmInboundLpn(
    receiptId: string,
    receiptLineId: string,
    input: ConfirmInboundLpnInput,
  ): Promise<InboundLpn>;
  releaseInboundToPutaway(
    receiptId: string,
    receiptLineId: string,
    input: ReleaseInboundToPutawayInput,
  ): Promise<InboundPutawayRelease>;
  captureDiscrepancy(
    receiptId: string,
    input: CaptureInboundDiscrepancyInput,
  ): Promise<InboundDiscrepancy>;
  evaluateQcTask(receiptId: string, input: EvaluateQcTaskInput): Promise<QcTask>;
  recordQcResult(qcTaskId: string, input: RecordQcResultInput): Promise<QcResult>;
}
