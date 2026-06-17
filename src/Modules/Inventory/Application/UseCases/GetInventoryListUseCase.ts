import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type { IInventoryRepository } from '@modules/Inventory/Application/Interfaces/IInventoryRepository';
import type { InventoryListFilter } from '@modules/Inventory/Domain/Types/InventoryQuery';
import { DEFAULT_PAGE_SIZE } from '@modules/Inventory/Domain/Constants/InventoryConstants';

/**
 * UseCase Pattern: the business operation "list inventory". Applies default
 * paging policy and could host filtering/authorization rules. Framework-free
 * and depends only on the Domain port — fully unit-testable with a mock repo.
 */
export class GetInventoryListUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  execute(filter: InventoryListFilter): Promise<PaginatedResponse<InventoryItem>> {
    const normalized: InventoryListFilter = {
      ...filter,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? DEFAULT_PAGE_SIZE,
      sortBy: filter.sortBy ?? 'sku',
      sortDir: filter.sortDir ?? 'asc',
    };
    return this.inventoryRepository.list(normalized);
  }
}
