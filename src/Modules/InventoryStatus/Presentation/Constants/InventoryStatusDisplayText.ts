import type { MasterDataStatus } from '@modules/InventoryStatus/Domain/Enums/InventoryStatusEnums';

const STATUS_LABELS: Record<MasterDataStatus, string> = {
  Active: 'Đang hoạt động',
  Inactive: 'Không hoạt động',
};

const UNKNOWN_LABEL = 'Không xác định';

export function masterDataStatusLabel(status: string | null | undefined): string {
  const trimmed = typeof status === 'string' ? status.trim() : '';
  if (!trimmed) {
    return UNKNOWN_LABEL;
  }

  return STATUS_LABELS[trimmed as MasterDataStatus] ?? UNKNOWN_LABEL;
}

export function booleanFlagValueLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Có';
  if (value === false) return 'Không';
  return UNKNOWN_LABEL;
}
