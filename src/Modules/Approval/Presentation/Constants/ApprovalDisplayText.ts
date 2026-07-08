import type { ActionCode, ApprovalDecision } from '@modules/Approval/Domain/Enums/ApprovalEnums';

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

const DECISION_LABELS: Record<ApprovalDecision, string> = {
  APPROVED: 'Đã phê duyệt',
  PENDING: 'Chờ duyệt',
  REJECTED: 'Đã từ chối',
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

export function approvalActionLabel(action: string | null | undefined): string {
  const raw = safeText(action);
  return ACTION_LABELS[raw as ActionCode] ?? unsupportedLabel('Hành động', raw);
}

export function approvalObjectTypeLabel(objectType: string | null | undefined): string {
  const raw = safeText(objectType);
  return OBJECT_TYPE_LABELS[raw] ?? unsupportedLabel('Loại đối tượng', raw);
}

export function approvalDecisionLabel(decision: string | null | undefined): string {
  const raw = safeText(decision);
  return DECISION_LABELS[raw as ApprovalDecision] ?? unsupportedLabel('Quyết định', raw);
}

export function approvalNoteLabel(note: string | null | undefined): string {
  const raw = note?.trim();
  return raw || '—';
}

export function approvalTargetLabel(
  objectType: string | null | undefined,
  targetCodeOrId: string | null | undefined,
): string {
  const typeLabel = approvalObjectTypeLabel(objectType);
  const reference = targetCodeOrId?.trim();
  return reference ? `${typeLabel} · ${reference}` : typeLabel;
}

export function approvalTargetLabelFromParts(
  objectType: string | null | undefined,
  targetCode: string | null | undefined,
  targetId: string | null | undefined,
): string {
  return approvalTargetLabel(objectType, firstNonBlankText(targetCode, targetId));
}

export function approvalReferenceLabel(
  referenceType: string | null | undefined,
  referenceId: string | null | undefined,
): string | null {
  const type = referenceType?.trim();
  const reference = referenceId?.trim();
  if (!type && !reference) return null;

  const typeLabel = type ? (OBJECT_TYPE_LABELS[type] ?? type) : null;
  if (typeLabel && reference) return `${typeLabel} · ${reference}`;
  return typeLabel ?? reference ?? null;
}
