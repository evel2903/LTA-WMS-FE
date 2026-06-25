import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type { IInventoryRepository } from '@modules/Inventory/Application/Interfaces/IInventoryRepository';
import type { InventoryListFilter } from '@modules/Inventory/Domain/Types/InventoryQuery';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@modules/Inventory/Domain/Constants/InventoryConstants';

/**
 * UseCase Pattern: the business operation "list inventory". Applies default
 * paging policy and could host filtering/authorization rules. Framework-free
 * and depends only on the Domain port — fully unit-testable with a mock repo.
 */
export class GetInventoryListUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  execute(filter: InventoryListFilter): Promise<PaginatedResponse<InventoryItem>> {
    const requestedPageSize = Math.trunc(filter.pageSize ?? DEFAULT_PAGE_SIZE);
    const normalized: InventoryListFilter = {
      ...filter,
      page: Math.max(1, Math.trunc(filter.page ?? 1)),
      pageSize:
        Number.isFinite(requestedPageSize) && requestedPageSize > 0
          ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
          : DEFAULT_PAGE_SIZE,
      sortBy: filter.sortBy ?? 'sku',
      sortDir: filter.sortDir ?? 'asc',
    };
    return this.inventoryRepository.list(normalized);
  }
}
