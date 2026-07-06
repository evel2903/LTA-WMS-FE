import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';
import type {
  InventorySerialLookupItemDto,
  PagedInventorySerialLookupDto,
} from '@modules/InventoryLookup/Infrastructure/Dtos/InventoryLookupDtos';

export const InventoryLookupMapper = {
  toItem(dto: InventorySerialLookupItemDto): InventorySerialLookupItem {
    return {
      dimensionId: dto.DimensionId,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      locationId: dto.LocationId,
      locationCode: dto.LocationCode,
      serialNumber: dto.SerialNumber,
      lotNumber: dto.LotNumber,
      expiryDate: dto.ExpiryDate,
      qtyOnHand: dto.QtyOnHand,
      qtyAvailable: dto.QtyAvailable,
      inventoryStatusCode: dto.InventoryStatusCode,
    };
  },

  toPaged(dto: PagedInventorySerialLookupDto): PaginatedResponse<InventorySerialLookupItem> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => InventoryLookupMapper.toItem(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },
};
