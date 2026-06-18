import type { MasterDataAuditFields, MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';

export type SkuStatus = 'Draft' | 'Active' | 'Blocked' | 'Discontinued';

/** Boolean control flags that drive SKU compliance policies. */
export type SkuControlFlagKey =
  | 'lotControlled'
  | 'expiryControlled'
  | 'serialControlled'
  | 'ownerControlled'
  | 'lpnControlled'
  | 'temperatureControlled'
  | 'dgControlled'
  | 'customsControlled'
  | 'qcRequired';

export interface Owner extends MasterDataAuditFields {
  id: string;
  ownerCode: string;
  ownerName: string;
  status: MasterDataStatus;
  billingPolicy: Record<string, unknown>;
  visibilityScope: Record<string, unknown>;
}

export interface Uom extends MasterDataAuditFields {
  id: string;
  uomCode: string;
  uomName: string;
  uomType: string | null;
  decimalPrecision: number;
  status: MasterDataStatus;
}

export interface Sku extends MasterDataAuditFields {
  id: string;
  skuCode: string;
  skuName: string;
  defaultOwnerId: string | null;
  itemClass: string;
  itemStatus: SkuStatus;
  baseUomId: string;
  inventoryUomId: string;
  lotControlled: boolean;
  expiryControlled: boolean;
  serialControlled: boolean;
  ownerControlled: boolean;
  lpnControlled: boolean;
  temperatureControlled: boolean;
  dgControlled: boolean;
  customsControlled: boolean;
  qcRequired: boolean;
  bondedFlag: boolean;
  temperatureClass: string | null;
  dgClass: string | null;
  shelfLifeDays: number | null;
  minRemainingShelfLifeDays: number | null;
}

export interface SkuBarcode extends MasterDataAuditFields {
  id: string;
  skuId: string;
  ownerId: string | null;
  uomId: string;
  packCode: string | null;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  status: MasterDataStatus;
}

export interface UomConversion extends MasterDataAuditFields {
  id: string;
  skuId: string;
  fromUomId: string;
  toUomId: string;
  factor: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: MasterDataStatus;
}

export interface ItemCoverage extends MasterDataAuditFields {
  id: string;
  skuId: string;
  warehouseId: string;
  ownerId: string | null;
  minQty: number;
  maxQty: number;
  standardQty: number;
  multipleQty: number;
  leadTimeDays: number;
  defaultReceiveWarehouseId: string | null;
  defaultShipWarehouseId: string | null;
  reorderPolicy: Record<string, unknown>;
  stopReceiving: boolean;
  stopShipping: boolean;
  status: MasterDataStatus;
}
