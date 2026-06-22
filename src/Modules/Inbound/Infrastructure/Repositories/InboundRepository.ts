import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import {
  INBOUND_DEFAULT_PAGE_SIZE,
  INBOUND_MAX_PAGE_SIZE,
} from '@modules/Inbound/Domain/Constants/InboundConstants';
import type { InboundPlan, ReceivingReadiness } from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  InboundPlanFilter,
  RecordGateInInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';
import { INBOUND_ENDPOINTS } from '@modules/Inbound/Infrastructure/Api/InboundEndpoints';
import type {
  InboundPlanDto,
  PagedInboundPlanDto,
  ReceivingReadinessDto,
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

  async create(input: CreateInboundPlanInput): Promise<InboundPlan> {
    const dto = await this.http.post<InboundPlanDto>(
      INBOUND_ENDPOINTS.PLANS,
      InboundMapper.toCreateRequest(input),
    );
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
}
