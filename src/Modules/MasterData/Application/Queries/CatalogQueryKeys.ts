import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  ItemCoverageListFilter,
  OwnerListFilter,
  PackDefinitionListFilter,
  SkuBarcodeListFilter,
  SkuListFilter,
  UomConversionListFilter,
  UomListFilter,
} from '@modules/MasterData/Domain/Types/CatalogQuery';

export const catalogQueryKeys = {
  all: [QUERY_NAMESPACES.MASTER_DATA] as const,
  owners: (filter?: OwnerListFilter) =>
    [...catalogQueryKeys.all, 'owners', filter ?? {}] as const,
  owner: (id: string) => [...catalogQueryKeys.all, 'owners', 'detail', id] as const,
  uoms: (filter?: UomListFilter) => [...catalogQueryKeys.all, 'uoms', filter ?? {}] as const,
  uom: (id: string) => [...catalogQueryKeys.all, 'uoms', 'detail', id] as const,
  skus: (filter?: SkuListFilter) => [...catalogQueryKeys.all, 'skus', filter ?? {}] as const,
  sku: (id: string) => [...catalogQueryKeys.all, 'skus', 'detail', id] as const,
  skuBarcodes: (filter?: SkuBarcodeListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'barcodes', filter ?? {}] as const,
  packDefinitions: (filter?: PackDefinitionListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'packs', filter ?? {}] as const,
  uomConversions: (filter?: UomConversionListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'conversions', filter ?? {}] as const,
  itemCoverages: (filter?: ItemCoverageListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'coverages', filter ?? {}] as const,
};
