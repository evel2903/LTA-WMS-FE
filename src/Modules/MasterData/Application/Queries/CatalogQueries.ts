import { useQuery } from '@tanstack/react-query';

import { catalogQueryKeys } from '@modules/MasterData/Application/Queries/CatalogQueryKeys';
import { CATALOG_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/CatalogConstants';
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

export function useOwner(id: string | null) {
  return useQuery({
    queryKey: catalogQueryKeys.owner(id ?? ''),
    queryFn: () => catalogRepository.getOwner(id as string),
    enabled: Boolean(id),
  });
}

export function useUoms(filter: UomListFilter = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.uoms(filter),
    queryFn: () => catalogRepository.listUoms(filter),
  });
}

export function useUom(id: string | null) {
  return useQuery({
    queryKey: catalogQueryKeys.uom(id ?? ''),
    queryFn: () => catalogRepository.getUom(id as string),
    enabled: Boolean(id),
  });
}

export function useSkus(filter: SkuListFilter = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.skus(filter),
    queryFn: () => catalogRepository.listSkus(filter),
  });
}

export function useSku(id: string | null) {
  return useQuery({
    queryKey: catalogQueryKeys.sku(id ?? ''),
    queryFn: () => catalogRepository.getSku(id as string),
    enabled: Boolean(id),
  });
}

/** Active owners for select inputs (FK pickers). */
export function useActiveOwners() {
  return useOwners({ status: 'Active', pageSize: CATALOG_DEFAULT_PAGE_SIZE });
}

/** Active UOMs for select inputs (FK pickers). */
export function useActiveUoms() {
  return useUoms({ status: 'Active', pageSize: CATALOG_DEFAULT_PAGE_SIZE });
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
  const packs = useQuery({
    queryKey: catalogQueryKeys.packDefinitions({ skuId: skuId ?? undefined }),
    queryFn: () => catalogRepository.listPackDefinitions({ skuId: skuId ?? undefined }),
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

  return { barcodes, packs, conversions, coverages };
}
