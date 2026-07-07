import type { DataScopeType } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

const ACTION_LABELS: Record<string, string> = {
  Adjust: 'Điều chỉnh',
  Approve: 'Phê duyệt',
  Cancel: 'Hủy',
  Create: 'Tạo mới',
  Delete: 'Xóa',
  DeleteCancel: 'Xóa/Hủy',
  Export: 'Xuất dữ liệu',
  Import: 'Nhập dữ liệu',
  Override: 'Ghi đè',
  Read: 'Xem',
  Reprint: 'In lại',
  Unlock: 'Mở khóa',
  Update: 'Cập nhật',
};

const OBJECT_TYPE_LABELS: Record<string, string> = {
  Customer: 'Khách hàng',
  DataScope: 'Phạm vi dữ liệu',
  InventoryStatus: 'Trạng thái tồn kho',
  Location: 'Vị trí',
  Owner: 'Chủ hàng',
  Permission: 'Quyền',
  ReasonCode: 'Mã lý do',
  Role: 'Vai trò',
  Rule: 'Quy tắc',
  RuleGroup: 'Nhóm quy tắc',
  Site: 'Cơ sở',
  SKU: 'SKU',
  Stock: 'Tồn kho',
  StockItem: 'Đơn vị tồn kho',
  UOM: 'Đơn vị tính',
  User: 'Người dùng',
  Warehouse: 'Kho',
  WarehouseProfile: 'Hồ sơ kho',
  Zone: 'Khu vực',
};

const DATA_SCOPE_TYPE_LABELS: Record<DataScopeType, string> = {
  CUSTOMER: 'Khách hàng',
  OWNER: 'Chủ hàng',
  WAREHOUSE: 'Kho',
  ZONE: 'Khu vực',
};

const UNKNOWN_LABEL = 'Không xác định';

function safeText(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || UNKNOWN_LABEL;
}

export function actionLabel(action: string | null | undefined): string {
  const rawValue = safeText(action);
  return ACTION_LABELS[rawValue] ?? rawValue;
}

export function objectTypeLabel(objectType: string | null | undefined): string {
  const rawValue = safeText(objectType);
  return OBJECT_TYPE_LABELS[rawValue] ?? rawValue;
}

export function dataScopeTypeLabel(scopeType: string | null | undefined): string {
  const rawValue = safeText(scopeType);
  return DATA_SCOPE_TYPE_LABELS[rawValue as DataScopeType] ?? rawValue;
}

export function permissionActionObjectLabel(
  action: string | null | undefined,
  objectType: string | null | undefined,
): string {
  const actionText = actionLabel(action);
  const objectTypeText = objectTypeLabel(objectType);
  if (actionText === UNKNOWN_LABEL && objectTypeText === UNKNOWN_LABEL) {
    return UNKNOWN_LABEL;
  }
  return `${actionText} ${objectTypeText}`;
}
