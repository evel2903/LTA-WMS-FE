import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  ItemCoverage,
  Owner,
  Sku,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  ItemCoverageListFilter,
  OwnerListFilter,
  SkuBarcodeListFilter,
  SkuListFilter,
  UomConversionListFilter,
  UomListFilter,
  UpdateOwnerInput,
  UpdateSkuInput,
  UpdateUomInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';

export interface ICatalogRepository {
  listOwners(filter?: OwnerListFilter): Promise<PaginatedResponse<Owner>>;
  listUoms(filter?: UomListFilter): Promise<PaginatedResponse<Uom>>;
  listSkus(filter?: SkuListFilter): Promise<PaginatedResponse<Sku>>;
  listSkuBarcodes(filter?: SkuBarcodeListFilter): Promise<PaginatedResponse<SkuBarcode>>;
  listUomConversions(filter?: UomConversionListFilter): Promise<PaginatedResponse<UomConversion>>;
  listItemCoverages(filter?: ItemCoverageListFilter): Promise<PaginatedResponse<ItemCoverage>>;

  getSku(id: string): Promise<Sku>;

  createOwner(input: CreateOwnerInput): Promise<Owner>;
  updateOwner(id: string, input: UpdateOwnerInput): Promise<Owner>;
  createUom(input: CreateUomInput): Promise<Uom>;
  updateUom(id: string, input: UpdateUomInput): Promise<Uom>;
  createSku(input: CreateSkuInput): Promise<Sku>;
  updateSku(id: string, input: UpdateSkuInput): Promise<Sku>;
  createSkuBarcode(input: CreateSkuBarcodeInput): Promise<SkuBarcode>;
  createUomConversion(input: CreateUomConversionInput): Promise<UomConversion>;
  createItemCoverage(input: CreateItemCoverageInput): Promise<ItemCoverage>;
}
