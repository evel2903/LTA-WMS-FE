import type {
  ActionCode,
  ObjectType,
  ReasonCodeStatus,
  ReasonGroup,
  RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

const REASON_GROUP_LABELS: Record<ReasonGroup, string> = {
  RULE_OVERRIDE: 'Ghi đè quy tắc',
  MASTER_DATA_CONFIG_CHANGE: 'Thay đổi dữ liệu chủ/cấu hình',
  HOLD_RELEASE: 'Giữ/Giải phóng',
  INVENTORY_ADJUSTMENT: 'Điều chỉnh tồn kho',
  INTEGRATION: 'Tích hợp',
  MANUAL_FIX: 'Sửa thủ công',
};

const STATUS_LABELS: Record<ReasonCodeStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Không hoạt động',
};

const ACTION_LABELS: Record<ActionCode, string> = {
  Adjust: 'Điều chỉnh',
  Approve: 'Phê duyệt',
  Create: 'Tạo mới',
  DeleteCancel: 'Xóa/Hủy',
  Override: 'Ghi đè',
  Read: 'Xem',
  Reprint: 'In lại',
  Unlock: 'Mở khóa',
  Update: 'Cập nhật',
};

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  Allocation: 'Phân bổ',
  ApprovalRequest: 'Yêu cầu phê duyệt',
  AuditLog: 'Nhật ký kiểm toán',
  CoreFlow: 'Luồng nghiệp vụ lõi',
  CycleCount: 'Kiểm kê chu kỳ',
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
  Shipment: 'Lô giao hàng',
  Site: 'Cơ sở',
  SKU: 'SKU',
  UOM: 'Đơn vị tính',
  UserAssignment: 'Phân quyền người dùng',
  Warehouse: 'Kho',
  WarehouseProfile: 'Hồ sơ kho',
  Zone: 'Khu vực',
};

const ROLE_LABELS: Record<RoleCode, string> = {
  INVENTORY_ACCOUNTANT: 'Kế toán kho',
  OPERATOR: 'Nhân viên vận hành',
  QC: 'QC',
  WAREHOUSE_COORDINATOR: 'Điều phối kho',
  WAREHOUSE_SUPERVISOR: 'Giám sát kho',
  WMS_ADMIN: 'WMS Admin',
};

const UNKNOWN_LABEL = 'Không xác định';
const NOT_APPLICABLE_LABEL = 'Không áp dụng';

function safeText(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || UNKNOWN_LABEL;
}

export function reasonGroupLabel(group: string | null | undefined): string {
  const rawValue = safeText(group);
  return REASON_GROUP_LABELS[rawValue as ReasonGroup] ?? rawValue;
}

export function reasonCodeStatusLabel(status: string | null | undefined): string {
  const rawValue = safeText(status);
  return STATUS_LABELS[rawValue as ReasonCodeStatus] ?? rawValue;
}

export function actionCodeLabel(action: string | null | undefined): string {
  const rawValue = safeText(action);
  return ACTION_LABELS[rawValue as ActionCode] ?? rawValue;
}

export function objectTypeLabel(objectType: string | null | undefined): string {
  const rawValue = safeText(objectType);
  return OBJECT_TYPE_LABELS[rawValue as ObjectType] ?? rawValue;
}

export function roleCodeLabel(roleCode: string | null | undefined): string {
  const rawValue = safeText(roleCode);
  return ROLE_LABELS[rawValue as RoleCode] ?? rawValue;
}

export function actionListLabel(actions: string[] | null | undefined): string {
  const safeActions = Array.isArray(actions)
    ? actions
        .map((action) => (typeof action === 'string' ? action.trim() : ''))
        .filter((action): action is string => action.length > 0)
    : [];
  return safeActions.length > 0 ? safeActions.map(actionCodeLabel).join(', ') : NOT_APPLICABLE_LABEL;
}

export function evidenceRequiredLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Bắt buộc';
  if (value === false) return 'Không yêu cầu';
  return UNKNOWN_LABEL;
}
