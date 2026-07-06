import type { SkuControlFlagKey, SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  LocationStatus,
  MasterDataStatus,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';

export const MASTER_DATA_EMPTY_LABELS = {
  owners: 'Chưa có chủ hàng.',
  uoms: 'Chưa có đơn vị tính.',
  skus: 'Chưa có SKU.',
} as const;

export const UOM_TYPE_OPTION_VALUES = [
  'Quantity',
  'Count',
  'Weight',
  'Volume',
  'Length',
  'Area',
] as const;

export const UOM_TYPE_LABELS: Record<string, string> = {
  Quantity: 'Số lượng',
  Count: 'Số đếm',
  Weight: 'Khối lượng',
  Volume: 'Thể tích',
  Length: 'Chiều dài',
  Area: 'Diện tích',
};

export const SKU_CONTROL_FLAG_LABELS: Record<SkuControlFlagKey, string> = {
  lotControlled: 'Kiểm soát lô',
  expiryControlled: 'Kiểm soát hạn dùng',
  serialControlled: 'Kiểm soát serial',
  ownerControlled: 'Kiểm soát chủ hàng',
  lpnControlled: 'Kiểm soát LPN (chưa có)',
  temperatureControlled: 'Kiểm soát nhiệt độ',
  dgControlled: 'Kiểm soát hàng nguy hiểm',
  customsControlled: 'Kiểm soát hải quan (chưa có)',
  qcRequired: 'Yêu cầu QC',
};

export const MASTER_DATA_STATUS_LABELS: Record<MasterDataStatus | LocationStatus, string> = {
  Active: 'Đang hoạt động',
  Inactive: 'Không hoạt động',
  Blocked: 'Tạm khóa',
  Maintenance: 'Bảo trì',
};

export const SKU_STATUS_LABELS: Record<SkuStatus, string> = {
  Draft: 'Nháp',
  Active: 'Đang kinh doanh',
  Blocked: 'Tạm khóa',
  Discontinued: 'Ngừng kinh doanh',
};

function displayMappedValue(labels: Record<string, string>, value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return labels[value] ?? value;
}

export function displayMasterDataStatus(status: string | null | undefined) {
  return displayMappedValue(MASTER_DATA_STATUS_LABELS, status);
}

export function displayUomType(uomType: string | null | undefined) {
  return displayMappedValue(UOM_TYPE_LABELS, uomType);
}

export function displaySkuStatus(status: string | null | undefined) {
  return displayMappedValue(SKU_STATUS_LABELS, status);
}
