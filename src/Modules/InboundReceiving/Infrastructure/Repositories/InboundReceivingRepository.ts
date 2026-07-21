import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { IInboundReceivingRepository } from '@modules/InboundReceiving/Application/Interfaces/IInboundReceivingRepository';
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
import { INBOUND_RECEIVING_ENDPOINTS } from '@modules/InboundReceiving/Infrastructure/Api/InboundReceivingEndpoints';
import type {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundOperationalStateDto,
  InboundPutawayReleaseDto,
  CreateManualReceiptResultDto,
  QcResultDto,
  QcTaskDto,
  PagedReceiptDto,
  ReceiptDto,
  ReceiptOperationalStateDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
} from '@modules/InboundReceiving/Infrastructure/Dtos/InboundReceivingDtos';
import { InboundReceivingMapper } from '@modules/InboundReceiving/Infrastructure/Mappers/InboundReceivingMapper';

export class InboundReceivingRepository implements IInboundReceivingRepository {
  constructor(private readonly http: HttpClient) {}

  async listReceipts(filter: ReceiptListFilter = {}): Promise<PaginatedResponse<Receipt>> {
    const dto = await this.http.get<PagedReceiptDto>(INBOUND_RECEIVING_ENDPOINTS.RECEIPTS, {
      params: {
        Page: filter.page ?? 1,
        PageSize: Math.min(Math.max(filter.pageSize ?? 50, 1), 100),
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        Search: filter.search,
        SortBy: filter.sortBy,
        SortDirection: filter.sortDirection,
      },
    });
    return InboundReceivingMapper.toPagedReceipts(dto);
  }

  async getReceipt(receiptId: string): Promise<Receipt> {
    const dto = await this.http.get<ReceiptDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_BY_ID(receiptId),
    );
    return InboundReceivingMapper.toReceipt(dto);
  }

  async getReceiptOperationalState(receiptId: string): Promise<ReceiptOperationalState> {
    const dto = await this.http.get<ReceiptOperationalStateDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPT_OPERATIONAL_STATE(receiptId),
    );
    return InboundReceivingMapper.toReceiptOperationalState(dto);
  }

  async createManualReceipt(input: CreateManualReceiptInput) {
    const dto = await this.http.post<CreateManualReceiptResultDto>(
      INBOUND_RECEIVING_ENDPOINTS.RECEIPTS,
      InboundReceivingMapper.toCreateManualReceiptRequest(input),
    );
    return {
      receipt: InboundReceivingMapper.toReceipt(dto.Receipt),
      session: InboundReceivingMapper.toReceivingSession(dto.Session),
      isDuplicate: dto.IsDuplicate,
    };
  }

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
