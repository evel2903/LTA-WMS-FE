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

// Copied verbatim from ReasonCode/Presentation/Constants/ReasonCodeDisplayText.ts (RA-04) — that
// file is the only place in the codebase with all 42 BE ObjectType values already labeled.
const OBJECT_TYPE_LABELS: Record<string, string> = {
  Allocation: 'Phân bổ',
  ApprovalRequest: 'Yêu cầu phê duyệt',
  AuditLog: 'Nhật ký kiểm toán',
  CoreFlow: 'Luồng nghiệp vụ lõi',
  CycleCount: 'Kiểm kê chu kỳ',
  Customer: 'Khách hàng',
  DataScope: 'Phạm vi dữ liệu',
  DeadLetterMessage: 'Thông điệp lỗi tích hợp',
  ExceptionCase: 'Hồ sơ ngoại lệ',
  GoodsIssue: 'Xuất hàng',
  InboundPlan: 'Kế hoạch nhập',
  IntegrationMessage: 'Thông điệp tích hợp',
  InventoryMovement: 'Dịch chuyển tồn kho',
  InventoryStatus: 'Trạng thái tồn kho',
  ItemCoverage: 'Bao phủ hàng hóa',
  LabelTemplate: 'Mẫu nhãn',
  Load: 'Chuyến tải',
  Location: 'Vị trí',
  LocationProfile: 'Hồ sơ vị trí',
  MobileTask: 'Tác vụ mobile',
  OutboundOrder: 'Đơn xuất',
  OverrideLog: 'Nhật ký ghi đè',
  Owner: 'Chủ hàng',
  Package: 'Kiện hàng',
  Partner: 'Đối tác',
  Permission: 'Quyền',
  PickTask: 'Tác vụ lấy hàng',
  PrintJob: 'Lệnh in',
  PutawayTask: 'Tác vụ cất hàng',
  QcTask: 'Tác vụ QC',
  ReasonCode: 'Mã lý do',
  Receipt: 'Phiếu nhận',
  ReconciliationRun: 'Lần đối soát',
  ReplenishmentTask: 'Tác vụ bổ sung',
  Role: 'Vai trò',
  Rule: 'Quy tắc',
  RuleGroup: 'Nhóm quy tắc',
  Shipment: 'Lô giao hàng',
  Site: 'Cơ sở',
  SKU: 'SKU',
  Stock: 'Tồn kho',
  StockItem: 'Đơn vị tồn kho',
  UOM: 'Đơn vị tính',
  User: 'Người dùng',
  UserAssignment: 'Phân quyền người dùng',
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
