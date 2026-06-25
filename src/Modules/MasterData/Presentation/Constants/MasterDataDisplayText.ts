import type { SkuControlFlagKey } from '@modules/MasterData/Domain/Types/CatalogEntities';

export const MASTER_DATA_EMPTY_LABELS = {
  owners: 'Chưa có chủ hàng.',
  uoms: 'Chưa có đơn vị tính.',
  skus: 'Chưa có SKU.',
} as const;

export const SKU_CONTROL_FLAG_LABELS: Record<SkuControlFlagKey, string> = {
  lotControlled: 'Kiểm soát lô',
  expiryControlled: 'Kiểm soát hạn dùng',
  serialControlled: 'Kiểm soát serial',
  ownerControlled: 'Kiểm soát chủ hàng',
  lpnControlled: 'Kiểm soát LPN',
  temperatureControlled: 'Kiểm soát nhiệt độ',
  dgControlled: 'Kiểm soát hàng nguy hiểm',
  customsControlled: 'Kiểm soát hải quan',
  qcRequired: 'Yêu cầu QC',
};
