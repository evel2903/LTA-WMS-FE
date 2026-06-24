import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { SkuControlFlagKey, SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';

export const CATALOG_DEFAULT_PAGE_SIZE = 50;
export const CATALOG_MAX_PAGE_SIZE = 100;

export const SKU_STATUSES: readonly SkuStatus[] = ['Draft', 'Active', 'Blocked', 'Discontinued'];

export const MASTER_DATA_STATUSES: readonly MasterDataStatus[] = ['Active', 'Inactive'];

/** Entity-specific empty-state copy per AC5 ("No SKUs/Owners/UOMs yet."). */
export const CATALOG_EMPTY_LABELS = {
  owners: 'No Owners yet.',
  uoms: 'No UOMs yet.',
  skus: 'No SKUs yet.',
} as const;

export interface SkuControlFlag {
  key: SkuControlFlagKey;
  label: string;
}

export const SKU_CONTROL_FLAGS: readonly SkuControlFlag[] = [
  { key: 'lotControlled', label: 'Lot controlled' },
  { key: 'expiryControlled', label: 'Expiry controlled' },
  { key: 'serialControlled', label: 'Serial controlled' },
  { key: 'ownerControlled', label: 'Owner controlled' },
  { key: 'lpnControlled', label: 'LPN controlled' },
  { key: 'temperatureControlled', label: 'Temperature controlled' },
  { key: 'dgControlled', label: 'DG controlled' },
  { key: 'customsControlled', label: 'Customs controlled' },
  { key: 'qcRequired', label: 'QC required' },
];
