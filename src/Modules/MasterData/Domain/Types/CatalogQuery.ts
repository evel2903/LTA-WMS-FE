import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';

// ── List filters (each endpoint has its own whitelisted set) ──────────────────

interface PageFilter {
  page?: number;
  pageSize?: number;
}

export interface OwnerListFilter extends PageFilter {
  status?: MasterDataStatus;
  ownerCode?: string;
  ownerName?: string;
  search?: string;
}

export interface UomListFilter extends PageFilter {
  status?: MasterDataStatus;
  uomCode?: string;
  uomName?: string;
  uomType?: string;
  search?: string;
}

export interface SkuListFilter extends PageFilter {
  itemStatus?: SkuStatus;
  skuCode?: string;
  skuName?: string;
  defaultOwnerId?: string;
  itemClass?: string;
  search?: string;
}

export interface SkuBarcodeListFilter extends PageFilter {
  skuId?: string;
  ownerId?: string;
  uomId?: string;
  barcodeValue?: string;
  status?: MasterDataStatus;
}

export interface PackDefinitionListFilter extends PageFilter {
  skuId?: string;
  uomId?: string;
  packCode?: string;
  status?: MasterDataStatus;
}

export interface UomConversionListFilter extends PageFilter {
  skuId?: string;
  fromUomId?: string;
  toUomId?: string;
  status?: MasterDataStatus;
  effectiveFrom?: string;
}

export interface ItemCoverageListFilter extends PageFilter {
  skuId?: string;
  warehouseId?: string;
  ownerId?: string;
  status?: MasterDataStatus;
}

// ── Create / Update input types (Update = Partial<Create>) ────────────────────

export interface CreateOwnerInput {
  ownerCode: string;
  ownerName: string;
  status: MasterDataStatus;
  billingPolicy?: Record<string, unknown>;
  visibilityScope?: Record<string, unknown>;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

export type UpdateOwnerInput = Partial<CreateOwnerInput>;

export interface CreateUomInput {
  uomCode: string;
  uomName: string;
  status: MasterDataStatus;
  uomType?: string | null;
  decimalPrecision?: number;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

export type UpdateUomInput = Partial<CreateUomInput>;

export interface CreateSkuInput {
  skuCode: string;
  skuName: string;
  itemClass: string;
  itemStatus: SkuStatus;
  baseUomId: string;
  inventoryUomId: string;
  defaultOwnerId?: string | null;
  lotControlled?: boolean;
  expiryControlled?: boolean;
  serialControlled?: boolean;
  ownerControlled?: boolean;
  lpnControlled?: boolean;
  temperatureControlled?: boolean;
  dgControlled?: boolean;
  customsControlled?: boolean;
  qcRequired?: boolean;
  bondedFlag?: boolean;
  temperatureClass?: string | null;
  dgClass?: string | null;
  shelfLifeDays?: number | null;
  minRemainingShelfLifeDays?: number | null;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

export type UpdateSkuInput = Partial<CreateSkuInput>;

export interface CreateSkuBarcodeInput {
  skuId: string;
  uomId: string;
  barcodeValue: string;
  barcodeType: string;
  status: MasterDataStatus;
  ownerId?: string | null;
  packCode?: string | null;
  isPrimary?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sourceSystem?: string | null;
  referenceId?: string | null;
  reasonCode?: string | null;
}

export type UpdateSkuBarcodeInput = Partial<CreateSkuBarcodeInput>;

export interface CreatePackDefinitionInput {
  skuId: string;
  packCode: string;
  packName: string;
  uomId: string;
  quantityPerPack: number;
  status: MasterDataStatus;
  isDefault?: boolean;
  sourceSystem?: string | null;
  referenceId?: string | null;
  reasonCode?: string | null;
}

export type UpdatePackDefinitionInput = Partial<CreatePackDefinitionInput>;

export interface CreateUomConversionInput {
  skuId: string;
  fromUomId: string;
  toUomId: string;
  factor: number;
  effectiveFrom: string;
  status: MasterDataStatus;
  effectiveTo?: string | null;
  sourceSystem?: string | null;
  referenceId?: string | null;
  reasonCode?: string | null;
}

export type UpdateUomConversionInput = Partial<CreateUomConversionInput>;

export interface CreateItemCoverageInput {
  skuId: string;
  warehouseId: string;
  status: MasterDataStatus;
  ownerId?: string | null;
  minQty?: number;
  maxQty?: number;
  standardQty?: number;
  multipleQty?: number;
  leadTimeDays?: number;
  defaultReceiveWarehouseId?: string | null;
  defaultShipWarehouseId?: string | null;
  reorderPolicy?: Record<string, unknown>;
  stopReceiving?: boolean;
  stopShipping?: boolean;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

export type UpdateItemCoverageInput = Partial<CreateItemCoverageInput>;
