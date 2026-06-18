import { useQuery } from '@tanstack/react-query';

import { catalogQueryKeys } from '@modules/MasterData/Application/Queries/CatalogQueryKeys';
import type {
  OwnerListFilter,
  SkuListFilter,
  UomListFilter,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import { catalogRepository } from '@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance';

export function useOwners(filter: OwnerListFilter = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.owners(filter),
    queryFn: () => catalogRepository.listOwners(filter),
  });
}

export function useUoms(filter: UomListFilter = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.uoms(filter),
    queryFn: () => catalogRepository.listUoms(filter),
  });
}

export function useSkus(filter: SkuListFilter = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.skus(filter),
    queryFn: () => catalogRepository.listSkus(filter),
  });
}

/** Active owners for select inputs (FK pickers). */
export function useActiveOwners() {
  return useOwners({ status: 'Active', pageSize: 200 });
}

/** Active UOMs for select inputs (FK pickers). */
export function useActiveUoms() {
  return useUoms({ status: 'Active', pageSize: 200 });
}

/**
 * Loads a SKU's related barcodes, conversions and coverages. Disabled until a
 * SKU is selected so the relations panel does not fire empty queries.
 */
export function useSkuRelations(skuId: string | null) {
  const enabled = Boolean(skuId);
  const barcodes = useQuery({
    queryKey: catalogQueryKeys.skuBarcodes({ skuId: skuId ?? undefined }),
    queryFn: () => catalogRepository.listSkuBarcodes({ skuId: skuId ?? undefined }),
    enabled,
  });
  const conversions = useQuery({
    queryKey: catalogQueryKeys.uomConversions({ skuId: skuId ?? undefined }),
    queryFn: () => catalogRepository.listUomConversions({ skuId: skuId ?? undefined }),
    enabled,
  });
  const coverages = useQuery({
    queryKey: catalogQueryKeys.itemCoverages({ skuId: skuId ?? undefined }),
    queryFn: () => catalogRepository.listItemCoverages({ skuId: skuId ?? undefined }),
    enabled,
  });

  return { barcodes, conversions, coverages };
}
