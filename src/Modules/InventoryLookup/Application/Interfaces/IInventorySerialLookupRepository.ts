import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';
import type { InventorySerialLookupFilter } from '@modules/InventoryLookup/Domain/Types/InventorySerialLookupQuery';

/**
 * Application port for the serial/lot lookup read model. Infrastructure
 * implements it; Presentation depends only on this contract via the query hook.
 */
export interface IInventorySerialLookupRepository {
  list(filter: InventorySerialLookupFilter): Promise<PaginatedResponse<InventorySerialLookupItem>>;
}
