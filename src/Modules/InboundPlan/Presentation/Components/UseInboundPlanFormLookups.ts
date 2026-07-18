import { useMemo, useState } from 'react';

import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  useActiveOwners,
  useActiveUoms,
  useSkus,
} from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useActiveWarehouses } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { usePartners } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { useWarehouseProfiles } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';

// IFB-24 review fix: shared by InboundPlanCreatePage and InboundPlanEditPanel so the two forms'
// catalog lookups (queries + {value,label} option mapping + warehouse search debounce)
// live in exactly one place instead of being copy-pasted per page.
export function useInboundPlanFormLookups() {
  const supplierQuery = usePartners({ partnerType: 'Supplier', status: 'Active', pageSize: 100 });
  const ownerQuery = useActiveOwners();
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const debouncedWarehouseSearch = useDebouncedValue(warehouseSearch, 300);
  const warehouseQuery = useActiveWarehouses(debouncedWarehouseSearch);
  const warehouseProfileQuery = useWarehouseProfiles({ status: 'ACTIVE', pageSize: 100 });
  const skuQuery = useSkus({ itemStatus: 'Active', pageSize: 100 });
  const uomQuery = useActiveUoms();

  const supplierOptions = useMemo(
    () =>
      (supplierQuery.data?.items ?? []).map((supplier) => ({
        value: supplier.id,
        label: `${supplier.partnerCode} - ${supplier.partnerName}`,
      })),
    [supplierQuery.data?.items],
  );
  const ownerOptions = useMemo(
    () =>
      (ownerQuery.data?.items ?? []).map((owner) => ({
        value: owner.id,
        label: `${owner.ownerCode} - ${owner.ownerName}`,
      })),
    [ownerQuery.data?.items],
  );
  const warehouseOptions = useMemo(
    () =>
      (warehouseQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
      })),
    [warehouseQuery.data?.items],
  );
  const warehouseProfileOptions = useMemo(
    () =>
      (warehouseProfileQuery.data?.items ?? []).map((profile) => ({
        value: profile.id,
        label: `${profile.profileCode} - ${profile.profileName}`,
      })),
    [warehouseProfileQuery.data?.items],
  );
  const skuOptions = useMemo(
    () =>
      (skuQuery.data?.items ?? []).map((sku) => ({
        value: sku.id,
        label: `${sku.skuCode} - ${sku.skuName}`,
      })),
    [skuQuery.data?.items],
  );
  const uomOptions = useMemo(
    () =>
      (uomQuery.data?.items ?? []).map((uom) => ({
        value: uom.id,
        label: `${uom.uomCode} - ${uom.uomName}`,
      })),
    [uomQuery.data?.items],
  );

  return {
    supplierQuery,
    supplierOptions,
    ownerQuery,
    ownerOptions,
    warehouseQuery,
    warehouseOptions,
    warehouseSearch,
    setWarehouseSearch,
    debouncedWarehouseSearch,
    warehouseProfileQuery,
    warehouseProfileOptions,
    skuQuery,
    skuOptions,
    uomQuery,
    uomOptions,
  };
}

export type InboundPlanFormLookups = ReturnType<typeof useInboundPlanFormLookups>;
