import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IInventoryStatusRepository } from '@modules/InventoryStatus/Application/Interfaces/IInventoryStatusRepository';
import { InventoryStatusRepository } from '@modules/InventoryStatus/Infrastructure/Repositories/InventoryStatusRepository';

export const inventoryStatusRepository: IInventoryStatusRepository = new InventoryStatusRepository(
  httpClient,
);
