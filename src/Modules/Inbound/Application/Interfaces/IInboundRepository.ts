import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundDiscrepancy,
  InboundPlan,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  EvaluateQcTaskInput,
  InboundPlanFilter,
  RecordQcResultInput,
  RecordGateInInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';

export interface IInboundRepository {
  list(filter?: InboundPlanFilter): Promise<PaginatedResponse<InboundPlan>>;
  getById(id: string): Promise<InboundPlan>;
  create(input: CreateInboundPlanInput): Promise<InboundPlan>;
  recordGateIn(id: string, input: RecordGateInInput): Promise<InboundPlan>;
  validateReadiness(
    id: string,
    input?: ValidateReceivingReadinessInput,
  ): Promise<ReceivingReadiness>;
  startReceivingSession(id: string, input?: StartReceivingSessionInput): Promise<ReceivingSession>;
  confirmReceiptLine(receiptId: string, input: ConfirmReceiptLineInput): Promise<ReceiptLine>;
  captureDiscrepancy(
    receiptId: string,
    input: CaptureInboundDiscrepancyInput,
  ): Promise<InboundDiscrepancy>;
  evaluateQcTask(receiptId: string, input: EvaluateQcTaskInput): Promise<QcTask>;
  recordQcResult(qcTaskId: string, input: RecordQcResultInput): Promise<QcResult>;
}
