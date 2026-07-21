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

export function useManualReceiptLookups() {
  const [supplierSearch, setSupplierSearch] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehouseProfileSearch, setWarehouseProfileSearch] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [uomSearch, setUomSearch] = useState('');
  const supplierQuery = usePartners({
    partnerType: 'Supplier',
    status: 'Active',
    pageSize: 100,
    search: useDebouncedValue(supplierSearch, 300) || undefined,
  });
  const ownerQuery = useActiveOwners(useDebouncedValue(ownerSearch, 300));
  const warehouseQuery = useActiveWarehouses(useDebouncedValue(warehouseSearch, 300));
  const warehouseProfileQuery = useWarehouseProfiles({
    status: 'ACTIVE',
    pageSize: 100,
    search: useDebouncedValue(warehouseProfileSearch, 300) || undefined,
  });
  const skuQuery = useSkus({
    itemStatus: 'Active',
    pageSize: 100,
    search: useDebouncedValue(skuSearch, 300) || undefined,
  });
  const uomQuery = useActiveUoms(useDebouncedValue(uomSearch, 300));

  const options = <T>(
    items: T[] | undefined,
    value: (item: T) => string,
    label: (item: T) => string,
  ) => (items ?? []).map((item) => ({ value: value(item), label: label(item) }));

  return {
    supplierQuery,
    supplierSearch,
    setSupplierSearch,
    supplierOptions: useMemo(
      () =>
        options(
          supplierQuery.data?.items,
          (item) => item.id,
          (item) => `${item.partnerCode} - ${item.partnerName}`,
        ),
      [supplierQuery.data?.items],
    ),
    ownerQuery,
    ownerSearch,
    setOwnerSearch,
    ownerOptions: useMemo(
      () =>
        options(
          ownerQuery.data?.items,
          (item) => item.id,
          (item) => `${item.ownerCode} - ${item.ownerName}`,
        ),
      [ownerQuery.data?.items],
    ),
    warehouseQuery,
    warehouseOptions: useMemo(
      () =>
        options(
          warehouseQuery.data?.items,
          (item) => item.id,
          (item) => `${item.warehouseCode} - ${item.warehouseName}`,
        ),
      [warehouseQuery.data?.items],
    ),
    warehouseSearch,
    setWarehouseSearch,
    warehouseProfileQuery,
    warehouseProfileSearch,
    setWarehouseProfileSearch,
    warehouseProfileOptions: useMemo(
      () =>
        options(
          warehouseProfileQuery.data?.items,
          (item) => item.id,
          (item) => `${item.profileCode} - ${item.profileName}`,
        ),
      [warehouseProfileQuery.data?.items],
    ),
    skuQuery,
    skuSearch,
    setSkuSearch,
    skuOptions: useMemo(
      () =>
        options(
          skuQuery.data?.items,
          (item) => item.id,
          (item) => `${item.skuCode} - ${item.skuName}`,
        ),
      [skuQuery.data?.items],
    ),
    uomQuery,
    uomSearch,
    setUomSearch,
    uomOptions: useMemo(
      () =>
        options(
          uomQuery.data?.items,
          (item) => item.id,
          (item) => `${item.uomCode} - ${item.uomName}`,
        ),
      [uomQuery.data?.items],
    ),
  };
}
