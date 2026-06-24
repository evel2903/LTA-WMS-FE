import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import type {
  InventoryStatusFilter,
  UpdateInventoryStatusInput,
} from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';
import type { IInventoryStatusRepository } from '@modules/InventoryStatus/Application/Interfaces/IInventoryStatusRepository';
import { INVENTORY_STATUS_ENDPOINTS } from '@modules/InventoryStatus/Infrastructure/Api/InventoryStatusEndpoints';
import type {
  InventoryStatusDto,
  PagedDto,
} from '@modules/InventoryStatus/Infrastructure/Dtos/InventoryStatusDtos';
import { InventoryStatusMapper } from '@modules/InventoryStatus/Infrastructure/Mappers/InventoryStatusMapper';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function page(value?: number): number {
  return !value || value < 1 ? 1 : value;
}

function pageSize(value?: number): number {
  if (!value || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(value, MAX_PAGE_SIZE);
}

/** The single place that touches `httpClient` for the inventory-status catalog. */
export class InventoryStatusRepository implements IInventoryStatusRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: InventoryStatusFilter = {}): Promise<PaginatedResponse<InventoryStatus>> {
    const dto = await this.http.get<PagedDto<InventoryStatusDto>>(
      INVENTORY_STATUS_ENDPOINTS.INVENTORY_STATUSES,
      {
        params: {
          Page: page(filter.page),
          PageSize: pageSize(filter.pageSize),
          StatusCode: filter.statusCode,
          StageGroup: filter.stageGroup,
          Status: filter.status,
        },
      },
    );
    return InventoryStatusMapper.toPaged(dto, (item) => InventoryStatusMapper.toInventoryStatus(item));
  }

  async getById(id: string): Promise<InventoryStatus> {
    const dto = await this.http.get<InventoryStatusDto>(
      INVENTORY_STATUS_ENDPOINTS.INVENTORY_STATUS_BY_ID(id),
    );
    return InventoryStatusMapper.toInventoryStatus(dto);
  }

  async update(id: string, input: UpdateInventoryStatusInput): Promise<InventoryStatus> {
    const dto = await this.http.patch<InventoryStatusDto>(
      INVENTORY_STATUS_ENDPOINTS.INVENTORY_STATUS_BY_ID(id),
      InventoryStatusMapper.toUpdateRequest(input),
    );
    return InventoryStatusMapper.toInventoryStatus(dto);
  }
}
