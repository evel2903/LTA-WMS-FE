import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { IInboundReceivingRepository } from '@modules/InboundReceiving/Application/Interfaces/IInboundReceivingRepository';
import type {
  InboundDiscrepancy,
  InboundLpn,
  InboundOperationalState,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/InboundReceiving/Domain/Types/Receipt';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  EvaluateQcTaskInput,
  RecordQcResultInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';
import { INBOUND_RECEIVING_ENDPOINTS } from '@modules/InboundReceiving/Infrastructure/Api/InboundReceivingEndpoints';
import type {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundOperationalStateDto,
  InboundPutawayReleaseDto,
  QcResultDto,
  QcTaskDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
} from '@modules/InboundReceiving/Infrastructure/Dtos/InboundReceivingDtos';
import { InboundReceivingMapper } from '@modules/InboundReceiving/Infrastructure/Mappers/InboundReceivingMapper';

export class InboundReceivingRepository implements IInboundReceivingRepository {
  constructor(private readonly http: HttpClient) {}

  async getOperationalState(planId: string): Promise<InboundOperationalState> {
    const dto = await this.http.get<InboundOperationalStateDto>(
      INBOUND_RECEIVING_ENDPOINTS.PLAN_OPERATIONAL_STATE(planId),
    );
    return InboundReceivingMapper.toOperationalState(dto);
  }

  async validateReadiness(
    planId: string,
    input: ValidateReceivingReadinessInput = {},
  ): Promise<ReceivingReadiness> {
    const dto = await this.http.post<ReceivingReadinessDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIVING_READINESS(planId),
      InboundReceivingMapper.toReadinessRequest(input),
    );
    return InboundReceivingMapper.toReadiness(dto);
  }

  async startReceivingSession(
    planId: string,
    input: StartReceivingSessionInput = {},
  ): Promise<ReceivingSession> {
    const dto = await this.http.post<ReceivingSessionDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIVING_SESSIONS(planId),
      InboundReceivingMapper.toStartReceivingRequest(input),
    );
    return InboundReceivingMapper.toReceivingSession(dto);
  }

  async confirmReceiptLine(
    receiptId: string,
    input: ConfirmReceiptLineInput,
  ): Promise<ReceiptLine> {
    const dto = await this.http.post<ReceiptLineDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_LINES(receiptId),
      InboundReceivingMapper.toConfirmReceiptLineRequest(input),
    );
    return InboundReceivingMapper.toReceiptLine(dto);
  }

  async confirmInboundLpn(
    receiptId: string,
    receiptLineId: string,
    input: ConfirmInboundLpnInput,
  ): Promise<InboundLpn> {
    const dto = await this.http.post<InboundLpnDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_LINE_LPN(receiptId, receiptLineId),
      InboundReceivingMapper.toConfirmInboundLpnRequest(input),
    );
    return InboundReceivingMapper.toInboundLpn(dto);
  }

  async releaseInboundToPutaway(
    receiptId: string,
    receiptLineId: string,
    input: ReleaseInboundToPutawayInput,
  ): Promise<InboundPutawayRelease> {
    const dto = await this.http.post<InboundPutawayReleaseDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_LINE_RELEASE_TO_PUTAWAY(receiptId, receiptLineId),
      InboundReceivingMapper.toReleaseInboundToPutawayRequest(input),
    );
    return InboundReceivingMapper.toInboundPutawayRelease(dto);
  }

  async captureDiscrepancy(
    receiptId: string,
    input: CaptureInboundDiscrepancyInput,
  ): Promise<InboundDiscrepancy> {
    const dto = await this.http.post<InboundDiscrepancyDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_DISCREPANCIES(receiptId),
      InboundReceivingMapper.toCaptureDiscrepancyRequest(input),
    );
    return InboundReceivingMapper.toInboundDiscrepancy(dto);
  }

  async evaluateQcTask(receiptId: string, input: EvaluateQcTaskInput): Promise<QcTask> {
    const dto = await this.http.post<QcTaskDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_QC_TASKS(receiptId),
      InboundReceivingMapper.toEvaluateQcTaskRequest(input),
    );
    return InboundReceivingMapper.toQcTask(dto);
  }

  async recordQcResult(qcTaskId: string, input: RecordQcResultInput): Promise<QcResult> {
    const dto = await this.http.post<QcResultDto>(
      INBOUND_RECEIVING_ENDPOINTS.QC_TASK_RESULTS(qcTaskId),
      InboundReceivingMapper.toRecordQcResultRequest(input),
    );
    return InboundReceivingMapper.toQcResult(dto);
  }
}
