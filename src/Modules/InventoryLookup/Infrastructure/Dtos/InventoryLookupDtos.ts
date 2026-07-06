export interface InventorySerialLookupItemDto {
  DimensionId: string;
  SkuId: string;
  SkuCode: string;
  WarehouseId: string;
  WarehouseCode: string;
  LocationId: string;
  LocationCode: string;
  SerialNumber: string | null;
  LotNumber: string | null;
  ExpiryDate: string | null;
  QtyOnHand: number;
  QtyAvailable: number;
  InventoryStatusCode: string;
}

export interface PagedInventorySerialLookupDto {
  Items: InventorySerialLookupItemDto[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}
