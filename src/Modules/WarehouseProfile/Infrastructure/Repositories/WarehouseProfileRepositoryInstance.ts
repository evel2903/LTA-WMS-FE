import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepository';

export const warehouseProfileRepository: IWarehouseProfileRepository =
  new WarehouseProfileRepository(httpClient);
