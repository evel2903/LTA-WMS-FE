import type {
  ActionCode,
  RuleControlMode,
} from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';

const UNKNOWN_LABEL = 'Không xác định';

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

const OBJECT_TYPE_LABELS: Record<string, string> = {
  ApprovalRequest: 'Yêu cầu phê duyệt',
  AuditLog: 'Nhật ký kiểm toán',
  ExceptionCase: 'Ngoại lệ kiểm soát',
  InboundPlan: 'Kế hoạch nhập kho',
  InventoryMovement: 'Giao dịch tồn kho',
  InventoryStatus: 'Trạng thái tồn kho',
  ItemCoverage: 'Bao phủ hàng hóa',
  Location: 'Vị trí',
  LocationProfile: 'Hồ sơ vị trí',
  Owner: 'Chủ hàng',
  OverrideLog: 'Nhật ký ghi đè',
  Permission: 'Quyền',
  PutawayTask: 'Tác vụ cất hàng',
  QcTask: 'Tác vụ QC',
  ReasonCode: 'Mã lý do',
  Receipt: 'Biên nhận',
  Role: 'Vai trò',
  Rule: 'Quy tắc',
  Site: 'Cơ sở',
  SKU: 'SKU',
  UOM: 'Đơn vị tính',
  UserAssignment: 'Gán người dùng',
  Warehouse: 'Kho',
  WarehouseProfile: 'Hồ sơ kho',
  Zone: 'Khu vực',
};

const CONTROL_MODE_LABELS: Record<RuleControlMode, string> = {
  APPROVAL_REQUIRED: 'Yêu cầu phê duyệt',
  AUTO_SUGGESTION: 'Gợi ý tự động',
  HARD_BLOCK: 'Chặn cứng',
  SOFT_WARNING: 'Cảnh báo mềm',
};

function safeText(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || UNKNOWN_LABEL;
}

function unsupportedLabel(kind: string, value: string | null | undefined): string {
  const raw = safeText(value);
  return raw === UNKNOWN_LABEL ? UNKNOWN_LABEL : `${kind} chưa hỗ trợ (${raw})`;
}

export function firstNonBlankText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function overrideActionLabel(action: string | null | undefined): string {
  const raw = safeText(action);
  return ACTION_LABELS[raw as ActionCode] ?? unsupportedLabel('Hành động', raw);
}

export function overrideObjectTypeLabel(objectType: string | null | undefined): string {
  const raw = safeText(objectType);
  return OBJECT_TYPE_LABELS[raw] ?? unsupportedLabel('Loại đối tượng', raw);
}

export function overrideControlModeLabel(mode: string | null | undefined): string {
  const raw = safeText(mode);
  return CONTROL_MODE_LABELS[raw as RuleControlMode] ?? unsupportedLabel('Chế độ kiểm soát', raw);
}

export function overrideTargetLabel(
  objectType: string | null | undefined,
  targetCodeOrId: string | null | undefined,
): string {
  const typeLabel = overrideObjectTypeLabel(objectType);
  const reference = targetCodeOrId?.trim();
  return reference ? `${typeLabel} · ${reference}` : typeLabel;
}

export function overrideTargetLabelFromParts(
  objectType: string | null | undefined,
  targetCode: string | null | undefined,
  targetId: string | null | undefined,
): string {
  return overrideTargetLabel(objectType, firstNonBlankText(targetCode, targetId));
}

export function overrideReasonLabel(
  reasonNote: string | null | undefined,
  reasonCodeId: string | null | undefined,
): string {
  return firstNonBlankText(reasonNote, reasonCodeId) ?? '—';
}
