import { httpClient, type HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type { IInventoryRepository } from '@modules/Inventory/Domain/Interfaces/IInventoryRepository';
import type {
  AdjustQuantityInput,
  InventoryListFilter,
} from '@modules/Inventory/Domain/Types/InventoryQuery';
import { INVENTORY_ENDPOINTS } from '@modules/Inventory/Infrastructure/Api/InventoryEndpoints';
import { InventoryMapper } from '@modules/Inventory/Infrastructure/Mappers/InventoryMapper';
import type {
  InventoryItemDto,
  InventoryListResponseDto,
} from '@modules/Inventory/Infrastructure/Dtos/InventoryDtos';

/**
 * Repository Pattern: concrete adapter for `IInventoryRepository`. Maps Domain
 * filter vocabulary to query params and DTOs back to entities. The rest of the
 * app is oblivious to URLs, snake_case, and pagination envelopes.
 */
export class InventoryRepository implements IInventoryRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async list(filter: InventoryListFilter): Promise<PaginatedResponse<InventoryItem>> {
    const dto = await this.http.get<InventoryListResponseDto>(INVENTORY_ENDPOINTS.LIST, {
      params: {
        page: filter.page,
        page_size: filter.pageSize,
        sort_by: filter.sortBy,
        sort_dir: filter.sortDir,
        search: filter.search,
        warehouse_id: filter.warehouseId,
        status: filter.status,
      },
    });
    return InventoryMapper.toPaginated(dto);
  }

  async getById(id: string): Promise<InventoryItem> {
    const dto = await this.http.get<InventoryItemDto>(INVENTORY_ENDPOINTS.BY_ID(id));
    return InventoryMapper.toEntity(dto);
  }

  async adjustQuantity(input: AdjustQuantityInput): Promise<InventoryItem> {
    const dto = await this.http.patch<InventoryItemDto>(
      INVENTORY_ENDPOINTS.ADJUST(input.itemId),
      InventoryMapper.toAdjustRequest(input),
    );
    return InventoryMapper.toEntity(dto);
  }
}

export const inventoryRepository: IInventoryRepository = new InventoryRepository();
