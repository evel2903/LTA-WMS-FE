import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import {
  INBOUND_DEFAULT_PAGE_SIZE,
  INBOUND_MAX_PAGE_SIZE,
} from '@modules/Inbound/Domain/Constants/InboundConstants';
import type {
  InboundDiscrepancy,
  InboundLineImportPreview,
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
import { INBOUND_ENDPOINTS } from '@modules/Inbound/Infrastructure/Api/InboundEndpoints';
import type {
  InboundDiscrepancyDto,
  InboundLineImportPreviewDto,
  InboundLpnDto,
  InboundOperationalStateDto,
  InboundPlanDto,
  InboundPutawayReleaseDto,
  PagedInboundPlanDto,
  QcResultDto,
  QcTaskDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
} from '@modules/Inbound/Infrastructure/Dtos/InboundDtos';
import { InboundMapper } from '@modules/Inbound/Infrastructure/Mappers/InboundMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return INBOUND_DEFAULT_PAGE_SIZE;
  return Math.min(value, INBOUND_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class InboundRepository implements IInboundRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: InboundPlanFilter = {}): Promise<PaginatedResponse<InboundPlan>> {
    const dto = await this.http.get<PagedInboundPlanDto>(INBOUND_ENDPOINTS.PLANS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        SourceSystem: filter.sourceSystem,
        SourceDocumentNumber: filter.sourceDocumentNumber,
        OwnerId: filter.ownerId,
        WarehouseId: filter.warehouseId,
        Status: filter.status,
      }),
    });
    return InboundMapper.toPaged(dto);
  }

  async getById(id: string): Promise<InboundPlan> {
    const dto = await this.http.get<InboundPlanDto>(INBOUND_ENDPOINTS.PLAN_BY_ID(id));
    return InboundMapper.toInboundPlan(dto);
  }

  async getOperationalState(id: string): Promise<InboundOperationalState> {
    const dto = await this.http.get<InboundOperationalStateDto>(
      INBOUND_ENDPOINTS.PLAN_OPERATIONAL_STATE(id),
    );
    return InboundMapper.toOperationalState(dto);
  }

  async create(input: CreateInboundPlanInput): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(
      INBOUND_ENDPOINTS.PLANS,
      InboundMapper.toCreateRequest(input),
    );
    return InboundMapper.toInboundPlan(dto);
  }

  async downloadLineImportTemplate(): Promise<Blob> {
    // Call on `this.http` (not an extracted reference) so a class-based HttpClient keeps its binding.
    if (!this.http.getBlob) {
      throw new Error('HttpClient.getBlob không khả dụng để tải template Excel.');
    }
    return this.http.getBlob(INBOUND_ENDPOINTS.LINE_IMPORT_TEMPLATE);
  }

  async previewLineImport(
    file: File,
    scope: { warehouseId: string; ownerId: string },
  ): Promise<InboundLineImportPreview> {
    const form = new FormData();
    form.append('file', file);
    const dto = await this.http.post<InboundLineImportPreviewDto>(INBOUND_ENDPOINTS.LINE_IMPORT, form, {
      params: { Preview: 'true', WarehouseId: scope.warehouseId, OwnerId: scope.ownerId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return InboundMapper.toLineImportPreview(dto);
  }

  async commitLineImport(
    file: File,
    header: Omit<CreateInboundPlanInput, 'lines'>,
  ): Promise<InboundPlan> {
    const form = new FormData();
    form.append('file', file);
    const dto = await this.http.post<InboundPlanDto>(INBOUND_ENDPOINTS.LINE_IMPORT, form, {
      params: removeUndefined({
        WarehouseId: header.warehouseId,
        OwnerId: header.ownerId,
        SourceSystem: header.sourceSystem,
        SourceDocumentType: header.sourceDocumentType,
        SourceDocumentNumber: header.sourceDocumentNumber,
        SupplierId: header.supplierId,
        WarehouseProfileId: header.warehouseProfileId ?? undefined,
        ExpectedArrivalAt: header.expectedArrivalAt ?? undefined,
      }),
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return InboundMapper.toInboundPlan(dto);
  }

  async recordGateIn(id: string, input: RecordGateInInput): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(
      INBOUND_ENDPOINTS.GATE_IN(id),
      InboundMapper.toGateInRequest(input),
    );
    return InboundMapper.toInboundPlan(dto);
  }

  async validateReadiness(
    id: string,
    input: ValidateReceivingReadinessInput = {},
  ): Promise<ReceivingReadiness> {
    const dto = await this.http.post<ReceivingReadinessDto>(
      INBOUND_ENDPOINTS.RECEIVING_READINESS(id),
      InboundMapper.toReadinessRequest(input),
    );
    return InboundMapper.toReadiness(dto);
  }

  async startReceivingSession(
    id: string,
    input: StartReceivingSessionInput = {},
  ): Promise<ReceivingSession> {
    const dto = await this.http.post<ReceivingSessionDto>(
      INBOUND_ENDPOINTS.RECEIVING_SESSIONS(id),
      InboundMapper.toStartReceivingRequest(input),
    );
    return InboundMapper.toReceivingSession(dto);
  }

  async confirmReceiptLine(
    receiptId: string,
    input: ConfirmReceiptLineInput,
  ): Promise<ReceiptLine> {
    const dto = await this.http.post<ReceiptLineDto>(
      INBOUND_ENDPOINTS.RECEIPT_LINES(receiptId),
      InboundMapper.toConfirmReceiptLineRequest(input),
    );
    return InboundMapper.toReceiptLine(dto);
  }

  async confirmInboundLpn(
    receiptId: string,
    receiptLineId: string,
    input: ConfirmInboundLpnInput,
  ): Promise<InboundLpn> {
    const dto = await this.http.post<InboundLpnDto>(
      INBOUND_ENDPOINTS.RECEIPT_LINE_LPN(receiptId, receiptLineId),
      InboundMapper.toConfirmInboundLpnRequest(input),
    );
    return InboundMapper.toInboundLpn(dto);
  }

  async releaseInboundToPutaway(
    receiptId: string,
    receiptLineId: string,
    input: ReleaseInboundToPutawayInput,
  ): Promise<InboundPutawayRelease> {
    const dto = await this.http.post<InboundPutawayReleaseDto>(
      INBOUND_ENDPOINTS.RECEIPT_LINE_RELEASE_TO_PUTAWAY(receiptId, receiptLineId),
      InboundMapper.toReleaseInboundToPutawayRequest(input),
    );
    return InboundMapper.toInboundPutawayRelease(dto);
  }

  async captureDiscrepancy(
    receiptId: string,
    input: CaptureInboundDiscrepancyInput,
  ): Promise<InboundDiscrepancy> {
    const dto = await this.http.post<InboundDiscrepancyDto>(
      INBOUND_ENDPOINTS.RECEIPT_DISCREPANCIES(receiptId),
      InboundMapper.toCaptureDiscrepancyRequest(input),
    );
    return InboundMapper.toInboundDiscrepancy(dto);
  }

  async evaluateQcTask(receiptId: string, input: EvaluateQcTaskInput): Promise<QcTask> {
    const dto = await this.http.post<QcTaskDto>(
      INBOUND_ENDPOINTS.RECEIPT_QC_TASKS(receiptId),
      InboundMapper.toEvaluateQcTaskRequest(input),
    );
    return InboundMapper.toQcTask(dto);
  }

  async recordQcResult(qcTaskId: string, input: RecordQcResultInput): Promise<QcResult> {
    const dto = await this.http.post<QcResultDto>(
      INBOUND_ENDPOINTS.QC_TASK_RESULTS(qcTaskId),
      InboundMapper.toRecordQcResultRequest(input),
    );
    return InboundMapper.toQcResult(dto);
  }
}
