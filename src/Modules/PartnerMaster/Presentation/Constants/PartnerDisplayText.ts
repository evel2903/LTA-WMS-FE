import type { PartnerStatus, PartnerType } from '@modules/PartnerMaster/Domain/Types/Partner';

export const PARTNER_EMPTY_LABEL_VI = 'Chưa có đối tác.';

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  Supplier: 'Nhà cung cấp',
  Customer: 'Khách hàng',
  Carrier: 'Đơn vị vận chuyển',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
};

function displayMappedValue(labels: Record<string, string>, value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return '-';
  }

  return labels[normalized] ?? normalized;
}

export function displayPartnerType(type: string | null | undefined) {
  return displayMappedValue(PARTNER_TYPE_LABELS, type);
}

export function displayPartnerStatus(status: string | null | undefined) {
  return displayMappedValue(PARTNER_STATUS_LABELS, status);
}
