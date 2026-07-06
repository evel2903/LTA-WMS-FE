import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { SkuControlFlagKey, SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';

export const CATALOG_DEFAULT_PAGE_SIZE = 50;
export const CATALOG_MAX_PAGE_SIZE = 100;

export const SKU_STATUSES: readonly SkuStatus[] = ['Draft', 'Active', 'Blocked', 'Discontinued'];

export const MASTER_DATA_STATUSES: readonly MasterDataStatus[] = ['Active', 'Inactive'];

/** Entity-specific empty-state copy per AC5 ("No SKUs/Owners/UOMs yet."). */
export const CATALOG_EMPTY_LABELS = {
  owners: 'Chưa có chủ hàng.',
  uoms: 'Chưa có đơn vị tính.',
  skus: 'Chưa có SKU.',
} as const;

export interface SkuControlFlag {
  key: SkuControlFlagKey;
  label: string;
}

export const SKU_CONTROL_FLAGS: readonly SkuControlFlag[] = [
  { key: 'lotControlled', label: 'Kiểm soát lô' },
  { key: 'expiryControlled', label: 'Kiểm soát hạn dùng' },
  { key: 'serialControlled', label: 'Kiểm soát serial' },
  { key: 'ownerControlled', label: 'Kiểm soát chủ hàng' },
  { key: 'lpnControlled', label: 'Kiểm soát LPN (chưa có)' },
  { key: 'temperatureControlled', label: 'Kiểm soát nhiệt độ' },
  { key: 'dgControlled', label: 'Kiểm soát hàng nguy hiểm' },
  { key: 'customsControlled', label: 'Kiểm soát hải quan (chưa có)' },
  { key: 'qcRequired', label: 'Yêu cầu QC' },
];
