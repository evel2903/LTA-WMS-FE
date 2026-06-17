/** Backend wire shapes for inventory. Infrastructure-only — never imported by Domain/Presentation. */
export interface InventoryItemDto {
  id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  location_code: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point: number;
  unit_of_measure: string;
  updated_at: string;
}

export interface InventoryListResponseDto {
  items: InventoryItemDto[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface AdjustQuantityRequestDto {
  delta: number;
  reason: string;
}
