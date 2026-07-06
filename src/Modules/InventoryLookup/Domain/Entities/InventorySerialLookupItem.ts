export interface InventorySerialLookupItem {
  dimensionId: string;
  skuId: string;
  skuCode: string;
  warehouseId: string;
  warehouseCode: string;
  locationId: string;
  locationCode: string;
  serialNumber: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  qtyOnHand: number;
  qtyAvailable: number;
  inventoryStatusCode: string;
}
