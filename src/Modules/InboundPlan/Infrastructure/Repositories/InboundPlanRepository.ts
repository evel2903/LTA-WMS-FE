import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundPlanRepository } from '@modules/InboundPlan/Application/Interfaces/IInboundPlanRepository';
import {
  INBOUND_DEFAULT_PAGE_SIZE,
  INBOUND_MAX_PAGE_SIZE,
} from '@modules/InboundPlan/Domain/Constants/InboundPlanConstants';
import type {
  InboundLineImportPreview,
  InboundPlan,
} from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  InboundPlanFilter,
  RecordGateInInput,
  UpdateInboundPlanInput,
} from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';
import { INBOUND_PLAN_ENDPOINTS } from '@modules/InboundPlan/Infrastructure/Api/InboundPlanEndpoints';
import type {
  InboundLineImportPreviewDto,
  InboundPlanDto,
  PagedInboundPlanDto,
} from '@modules/InboundPlan/Infrastructure/Dtos/InboundPlanDtos';
import { InboundPlanMapper } from '@modules/InboundPlan/Infrastructure/Mappers/InboundPlanMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return INBOUND_DEFAULT_PAGE_SIZE;
  return Math.min(value, INBOUND_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class InboundPlanRepository implements IInboundPlanRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: InboundPlanFilter = {}): Promise<PaginatedResponse<InboundPlan>> {
    const dto = await this.http.get<PagedInboundPlanDto>(INBOUND_PLAN_ENDPOINTS.PLANS, {
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
    return InboundPlanMapper.toPaged(dto);
  }

  async getById(id: string): Promise<InboundPlan> {
    const dto = await this.http.get<InboundPlanDto>(INBOUND_PLAN_ENDPOINTS.PLAN_BY_ID(id));
    return InboundPlanMapper.toInboundPlan(dto);
  }

  async create(input: CreateInboundPlanInput): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(
      INBOUND_PLAN_ENDPOINTS.PLANS,
      InboundPlanMapper.toCreateRequest(input),
    );
    return InboundPlanMapper.toInboundPlan(dto);
  }

  async update(id: string, input: UpdateInboundPlanInput): Promise<InboundPlan> {
    const dto = await this.http.patch<InboundPlanDto>(
      INBOUND_PLAN_ENDPOINTS.PLAN_BY_ID(id),
      InboundPlanMapper.toUpdateRequest(input),
    );
    return InboundPlanMapper.toInboundPlan(dto);
  }

  async confirm(id: string): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(INBOUND_PLAN_ENDPOINTS.PLAN_CONFIRM(id), {});
    return InboundPlanMapper.toInboundPlan(dto);
  }

  async cancel(id: string): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(INBOUND_PLAN_ENDPOINTS.PLAN_CANCEL(id), {});
    return InboundPlanMapper.toInboundPlan(dto);
  }

  async downloadLineImportTemplate(): Promise<Blob> {
    // Call on `this.http` (not an extracted reference) so a class-based HttpClient keeps its binding.
    if (!this.http.getBlob) {
      throw new Error('HttpClient.getBlob không khả dụng để tải template Excel.');
    }
    return this.http.getBlob(INBOUND_PLAN_ENDPOINTS.LINE_IMPORT_TEMPLATE);
  }

  async previewLineImport(
    file: File,
    scope: { warehouseId: string; ownerId: string },
  ): Promise<InboundLineImportPreview> {
    const form = new FormData();
    form.append('file', file);
    const dto = await this.http.post<InboundLineImportPreviewDto>(
      INBOUND_PLAN_ENDPOINTS.LINE_IMPORT,
      form,
      {
        params: { Preview: 'true', WarehouseId: scope.warehouseId, OwnerId: scope.ownerId },
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return InboundPlanMapper.toLineImportPreview(dto);
  }

  async commitLineImport(
    file: File,
    header: Omit<CreateInboundPlanInput, 'lines'>,
  ): Promise<InboundPlan> {
    const form = new FormData();
    form.append('file', file);
    const dto = await this.http.post<InboundPlanDto>(INBOUND_PLAN_ENDPOINTS.LINE_IMPORT, form, {
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
    return InboundPlanMapper.toInboundPlan(dto);
  }

  async recordGateIn(id: string, input: RecordGateInInput): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(
      INBOUND_PLAN_ENDPOINTS.GATE_IN(id),
      InboundPlanMapper.toGateInRequest(input),
    );
    return InboundPlanMapper.toInboundPlan(dto);
  }
}
