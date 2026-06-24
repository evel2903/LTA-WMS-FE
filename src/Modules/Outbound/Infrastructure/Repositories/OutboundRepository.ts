import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IOutboundRepository } from '@modules/Outbound/Application/Interfaces/IOutboundRepository';
import {
  OUTBOUND_DEFAULT_PAGE_SIZE,
  OUTBOUND_MAX_PAGE_SIZE,
} from '@modules/Outbound/Domain/Constants/OutboundConstants';
import type { Allocation, OutboundOrder, PickRelease } from '@modules/Outbound/Domain/Types/OutboundOrder';
import type {
  AllocateOutboundOrderInput,
  AllocationListFilter,
  ImportOutboundOrderInput,
  OutboundOrderListFilter,
  PickReleaseListFilter,
  ReasonOutboundOrderInput,
  ReleaseOutboundOrderInput,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';
import { OUTBOUND_ENDPOINTS } from '@modules/Outbound/Infrastructure/Api/OutboundEndpoints';
import type {
  AllocationDto,
  OutboundOrderDto,
  PagedAllocationDto,
  PagedOutboundOrderDto,
  PagedPickReleaseDto,
  PickReleaseDto,
} from '@modules/Outbound/Infrastructure/Dtos/OutboundDtos';
import { OutboundMapper } from '@modules/Outbound/Infrastructure/Mappers/OutboundMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return OUTBOUND_DEFAULT_PAGE_SIZE;
  return Math.min(value, OUTBOUND_MAX_PAGE_SIZE);
}

function pageNumber(value?: number): number {
  if (!value || value < 1) return 1;
  return value;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class OutboundRepository implements IOutboundRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: OutboundOrderListFilter = {}): Promise<PaginatedResponse<OutboundOrder>> {
    const dto = await this.http.get<PagedOutboundOrderDto>(OUTBOUND_ENDPOINTS.ORDERS, {
      params: removeUndefined({
        Page: pageNumber(filter.page),
        PageSize: pageSize(filter.pageSize),
        SourceSystem: filter.sourceSystem,
        SourceReference: filter.sourceReference,
        OwnerId: filter.ownerId,
        WarehouseId: filter.warehouseId,
        CustomerId: filter.customerId,
        DocumentStatus: filter.documentStatus,
      }),
    });
    return OutboundMapper.toPaged(dto);
  }

  async getById(id: string): Promise<OutboundOrder> {
    const dto = await this.http.get<OutboundOrderDto>(OUTBOUND_ENDPOINTS.ORDER_BY_ID(id));
    return OutboundMapper.toOrder(dto);
  }

  async importOrder(input: ImportOutboundOrderInput): Promise<OutboundOrder> {
    const dto = await this.http.post<OutboundOrderDto>(
      OUTBOUND_ENDPOINTS.ORDERS,
      OutboundMapper.toImportRequest(input),
    );
    return OutboundMapper.toOrder(dto);
  }

  async validate(id: string): Promise<OutboundOrder> {
    const dto = await this.http.post<OutboundOrderDto>(OUTBOUND_ENDPOINTS.VALIDATE(id), {});
    return OutboundMapper.toOrder(dto);
  }

  async hold(id: string, input: ReasonOutboundOrderInput): Promise<OutboundOrder> {
    const dto = await this.http.post<OutboundOrderDto>(
      OUTBOUND_ENDPOINTS.HOLD(id),
      OutboundMapper.toReasonRequest(input),
    );
    return OutboundMapper.toOrder(dto);
  }

  async reject(id: string, input: ReasonOutboundOrderInput): Promise<OutboundOrder> {
    const dto = await this.http.post<OutboundOrderDto>(
      OUTBOUND_ENDPOINTS.REJECT(id),
      OutboundMapper.toReasonRequest(input),
    );
    return OutboundMapper.toOrder(dto);
  }

  async cancel(id: string, input: ReasonOutboundOrderInput): Promise<OutboundOrder> {
    const dto = await this.http.post<OutboundOrderDto>(
      OUTBOUND_ENDPOINTS.CANCEL(id),
      OutboundMapper.toReasonRequest(input),
    );
    return OutboundMapper.toOrder(dto);
  }

  async allocate(id: string, input: AllocateOutboundOrderInput): Promise<Allocation> {
    const dto = await this.http.post<AllocationDto>(
      OUTBOUND_ENDPOINTS.ALLOCATE(id),
      OutboundMapper.toAllocateRequest(input),
    );
    return OutboundMapper.toAllocation(dto);
  }

  async listAllocations(
    id: string,
    filter: AllocationListFilter = {},
  ): Promise<PaginatedResponse<Allocation>> {
    const dto = await this.http.get<PagedAllocationDto>(OUTBOUND_ENDPOINTS.ALLOCATIONS(id), {
      params: removeUndefined({
        Page: pageNumber(filter.page),
        PageSize: pageSize(filter.pageSize),
        Status: filter.status,
      }),
    });
    return OutboundMapper.toPagedAllocations(dto);
  }

  async getAllocation(id: string): Promise<Allocation> {
    const dto = await this.http.get<AllocationDto>(OUTBOUND_ENDPOINTS.ALLOCATION_BY_ID(id));
    return OutboundMapper.toAllocation(dto);
  }

  async release(id: string, input: ReleaseOutboundOrderInput): Promise<PickRelease> {
    const dto = await this.http.post<PickReleaseDto>(
      OUTBOUND_ENDPOINTS.RELEASE(id),
      OutboundMapper.toReleaseRequest(input),
    );
    return OutboundMapper.toPickRelease(dto);
  }

  async listReleases(
    id: string,
    filter: PickReleaseListFilter = {},
  ): Promise<PaginatedResponse<PickRelease>> {
    const dto = await this.http.get<PagedPickReleaseDto>(OUTBOUND_ENDPOINTS.RELEASES(id), {
      params: removeUndefined({
        Page: pageNumber(filter.page),
        PageSize: pageSize(filter.pageSize),
        Status: filter.status,
      }),
    });
    return OutboundMapper.toPagedPickReleases(dto);
  }

  async getRelease(id: string): Promise<PickRelease> {
    const dto = await this.http.get<PickReleaseDto>(OUTBOUND_ENDPOINTS.RELEASE_BY_ID(id));
    return OutboundMapper.toPickRelease(dto);
  }
}
