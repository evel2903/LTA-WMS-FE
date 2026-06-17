import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InventoryItem,
  InventoryItemId,
} from '@modules/Inventory/Domain/Entities/InventoryItem';
import type { AdjustQuantityInput } from '@modules/Inventory/Domain/Types/InventoryQuery';
import type {
  AdjustQuantityRequestDto,
  InventoryItemDto,
  InventoryListResponseDto,
} from '@modules/Inventory/Infrastructure/Dtos/InventoryDtos';

/**
 * DTO ↔ Domain translation boundary for inventory. The only file aware of both
 * the snake_case wire format and the camelCase Domain entity.
 */
export const InventoryMapper = {
  toEntity(dto: InventoryItemDto): InventoryItem {
    return {
      id: dto.id as InventoryItemId,
      sku: dto.sku,
      productName: dto.product_name,
      warehouseId: dto.warehouse_id,
      locationCode: dto.location_code,
      quantityOnHand: dto.quantity_on_hand,
      quantityReserved: dto.quantity_reserved,
      reorderPoint: dto.reorder_point,
      unitOfMeasure: dto.unit_of_measure,
      updatedAt: dto.updated_at,
    };
  },

  toPaginated(dto: InventoryListResponseDto): PaginatedResponse<InventoryItem> {
    return {
      items: dto.items.map(InventoryMapper.toEntity),
      page: dto.page,
      pageSize: dto.page_size,
      totalItems: dto.total_items,
      totalPages: dto.total_pages,
    };
  },

  toAdjustRequest(input: AdjustQuantityInput): AdjustQuantityRequestDto {
    return { delta: input.delta, reason: input.reason };
  },
};
