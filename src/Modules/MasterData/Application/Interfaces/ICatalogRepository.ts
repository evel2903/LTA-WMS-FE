import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  ItemCoverage,
  Owner,
  PackDefinition,
  Sku,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreatePackDefinitionInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  ItemCoverageListFilter,
  OwnerListFilter,
  PackDefinitionListFilter,
  SkuBarcodeListFilter,
  SkuListFilter,
  UomConversionListFilter,
  UomListFilter,
  UpdateItemCoverageInput,
  UpdateOwnerInput,
  UpdatePackDefinitionInput,
  UpdateSkuBarcodeInput,
  UpdateSkuInput,
  UpdateUomConversionInput,
  UpdateUomInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';

export interface ICatalogRepository {
  listOwners(filter?: OwnerListFilter): Promise<PaginatedResponse<Owner>>;
  listUoms(filter?: UomListFilter): Promise<PaginatedResponse<Uom>>;
  listSkus(filter?: SkuListFilter): Promise<PaginatedResponse<Sku>>;
  listSkuBarcodes(filter?: SkuBarcodeListFilter): Promise<PaginatedResponse<SkuBarcode>>;
  listPackDefinitions(filter?: PackDefinitionListFilter): Promise<PaginatedResponse<PackDefinition>>;
  listUomConversions(filter?: UomConversionListFilter): Promise<PaginatedResponse<UomConversion>>;
  listItemCoverages(filter?: ItemCoverageListFilter): Promise<PaginatedResponse<ItemCoverage>>;

  getOwner(id: string): Promise<Owner>;
  getUom(id: string): Promise<Uom>;
  getSku(id: string): Promise<Sku>;
  getPackDefinition(id: string): Promise<PackDefinition>;

  createOwner(input: CreateOwnerInput): Promise<Owner>;
  updateOwner(id: string, input: UpdateOwnerInput): Promise<Owner>;
  createUom(input: CreateUomInput): Promise<Uom>;
  updateUom(id: string, input: UpdateUomInput): Promise<Uom>;
  createSku(input: CreateSkuInput): Promise<Sku>;
  updateSku(id: string, input: UpdateSkuInput): Promise<Sku>;
  createSkuBarcode(input: CreateSkuBarcodeInput): Promise<SkuBarcode>;
  updateSkuBarcode(id: string, input: UpdateSkuBarcodeInput): Promise<SkuBarcode>;
  createPackDefinition(input: CreatePackDefinitionInput): Promise<PackDefinition>;
  updatePackDefinition(id: string, input: UpdatePackDefinitionInput): Promise<PackDefinition>;
  createUomConversion(input: CreateUomConversionInput): Promise<UomConversion>;
  updateUomConversion(id: string, input: UpdateUomConversionInput): Promise<UomConversion>;
  createItemCoverage(input: CreateItemCoverageInput): Promise<ItemCoverage>;
  updateItemCoverage(id: string, input: UpdateItemCoverageInput): Promise<ItemCoverage>;
}
