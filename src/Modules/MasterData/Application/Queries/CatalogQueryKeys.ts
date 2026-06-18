import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  ItemCoverageListFilter,
  OwnerListFilter,
  SkuBarcodeListFilter,
  SkuListFilter,
  UomConversionListFilter,
  UomListFilter,
} from '@modules/MasterData/Domain/Types/CatalogQuery';

export const catalogQueryKeys = {
  all: [QUERY_NAMESPACES.MASTER_DATA] as const,
  owners: (filter?: OwnerListFilter) =>
    [...catalogQueryKeys.all, 'owners', filter ?? {}] as const,
  uoms: (filter?: UomListFilter) => [...catalogQueryKeys.all, 'uoms', filter ?? {}] as const,
  skus: (filter?: SkuListFilter) => [...catalogQueryKeys.all, 'skus', filter ?? {}] as const,
  skuBarcodes: (filter?: SkuBarcodeListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'barcodes', filter ?? {}] as const,
  uomConversions: (filter?: UomConversionListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'conversions', filter ?? {}] as const,
  itemCoverages: (filter?: ItemCoverageListFilter) =>
    [...catalogQueryKeys.all, 'skuRelations', 'coverages', filter ?? {}] as const,
};
