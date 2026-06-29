import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundDiscrepancy,
  InboundLpn,
  InboundOperationalState,
  InboundPlan,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  EvaluateQcTaskInput,
  InboundPlanFilter,
  RecordQcResultInput,
  RecordGateInInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';

export interface IInboundRepository {
  list(filter?: InboundPlanFilter): Promise<PaginatedResponse<InboundPlan>>;
  getById(id: string): Promise<InboundPlan>;
  getOperationalState(id: string): Promise<InboundOperationalState>;
  create(input: CreateInboundPlanInput): Promise<InboundPlan>;
  recordGateIn(id: string, input: RecordGateInInput): Promise<InboundPlan>;
  validateReadiness(
    id: string,
    input?: ValidateReceivingReadinessInput,
  ): Promise<ReceivingReadiness>;
  startReceivingSession(id: string, input?: StartReceivingSessionInput): Promise<ReceivingSession>;
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
