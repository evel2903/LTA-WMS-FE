import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IInventorySerialLookupRepository } from '@modules/InventoryLookup/Application/Interfaces/IInventorySerialLookupRepository';
import { InventorySerialLookupRepository } from '@modules/InventoryLookup/Infrastructure/Repositories/InventorySerialLookupRepository';

export const inventorySerialLookupRepository: IInventorySerialLookupRepository =
  new InventorySerialLookupRepository(httpClient);
