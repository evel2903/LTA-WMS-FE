import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';
import {
  INVENTORY_LOOKUP_DEFAULT_PAGE_SIZE,
  INVENTORY_LOOKUP_MAX_PAGE_SIZE,
} from '@modules/InventoryLookup/Domain/Constants/InventoryLookupConstants';
import type { InventorySerialCorrectionRequest } from '@modules/InventoryLookup/Domain/Types/InventorySerialCorrectionRequest';
import type { InventorySerialLookupFilter } from '@modules/InventoryLookup/Domain/Types/InventorySerialLookupQuery';
import type { IInventorySerialLookupRepository } from '@modules/InventoryLookup/Application/Interfaces/IInventorySerialLookupRepository';
import { INVENTORY_LOOKUP_ENDPOINTS } from '@modules/InventoryLookup/Infrastructure/Api/InventoryLookupEndpoints';
import { InventoryLookupMapper } from '@modules/InventoryLookup/Infrastructure/Mappers/InventoryLookupMapper';
import type {
  CorrectSerialNumberRequestDto,
  PagedInventorySerialLookupDto,
} from '@modules/InventoryLookup/Infrastructure/Dtos/InventoryLookupDtos';

function pageSize(value?: number): number {
  if (!value || value < 1) return INVENTORY_LOOKUP_DEFAULT_PAGE_SIZE;
  return Math.min(value, INVENTORY_LOOKUP_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class InventorySerialLookupRepository implements IInventorySerialLookupRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: InventorySerialLookupFilter): Promise<PaginatedResponse<InventorySerialLookupItem>> {
    const dto = await this.http.get<PagedInventorySerialLookupDto>(INVENTORY_LOOKUP_ENDPOINTS.LOOKUP, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        SkuId: filter.skuId,
        WarehouseId: filter.warehouseId,
        SerialNumber: filter.serialNumber,
        LotNumber: filter.lotNumber,
      }),
    });
    return InventoryLookupMapper.toPaged(dto);
  }

  async correct(request: InventorySerialCorrectionRequest): Promise<void> {
    const body: CorrectSerialNumberRequestDto = {
      SourceDimensionId: request.dimensionId,
      NewSerialNumber: request.newSerialNumber,
      ReasonCode: request.reasonCode,
      EvidenceRefs: request.evidenceRefs,
      IdempotencyKey: request.idempotencyKey,
    };
    await this.http.post<unknown>(INVENTORY_LOOKUP_ENDPOINTS.CORRECT_SERIAL, body);
  }
}
