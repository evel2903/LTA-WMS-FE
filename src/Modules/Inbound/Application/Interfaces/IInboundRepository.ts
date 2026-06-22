import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundPlan,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  InboundPlanFilter,
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
}
