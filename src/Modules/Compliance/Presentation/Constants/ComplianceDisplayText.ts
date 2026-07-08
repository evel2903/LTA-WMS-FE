import type {
  ActionCode,
  ActorType,
  AuditResult,
  ControlExceptionSeverity,
  ExceptionAction,
  ExceptionOutcome,
  ExceptionState,
  ExceptionSubStatus,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';

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

const AUDIT_RESULT_LABELS: Record<AuditResult, string> = {
  BLOCKED: 'Bị chặn',
  FAILED: 'Thất bại',
  SUCCESS: 'Thành công',
};

const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  SYSTEM: 'Hệ thống',
  USER: 'Người dùng',
};

const EXCEPTION_STATE_LABELS: Record<ExceptionState, string> = {
  ASSIGNED: 'Đã gán xử lý',
  CLOSED: 'Đã đóng',
  DETECTED: 'Mới phát hiện',
  IN_REVIEW_PENDING_APPROVAL: 'Đang rà soát / chờ phê duyệt',
  LOGGED: 'Đã ghi log',
  RESOLVED: 'Đã xử lý',
};

const EXCEPTION_SEVERITY_LABELS: Record<ControlExceptionSeverity, string> = {
  HIGH: 'Cao',
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
};

const EXCEPTION_ACTION_LABELS: Record<ExceptionAction, string> = {
  Assign: 'Gán xử lý',
  Close: 'Đóng ngoại lệ',
  Log: 'Ghi log',
  Resolve: 'Xử lý ngoại lệ',
  Submit: 'Gửi rà soát',
};

const EXCEPTION_SUB_STATUS_LABELS: Record<ExceptionSubStatus, string> = {
  AUTO_BLOCKED: 'Tự động chặn',
  ESCALATED: 'Đã leo thang',
  REASSIGNED: 'Đã gán lại',
  REJECTED: 'Bị từ chối',
  REWORK: 'Cần làm lại',
};

const EXCEPTION_OUTCOME_LABELS: Record<ExceptionOutcome, string> = {
  AUTO_CLOSED: 'Tự động đóng',
  CANCELLED: 'Đã hủy',
  DUPLICATE: 'Trùng lặp',
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

export function complianceActionLabel(action: string | null | undefined): string {
  const raw = safeText(action);
  return ACTION_LABELS[raw as ActionCode] ?? unsupportedLabel('Hành động', raw);
}

export function complianceObjectTypeLabel(objectType: string | null | undefined): string {
  const raw = safeText(objectType);
  return OBJECT_TYPE_LABELS[raw] ?? unsupportedLabel('Loại đối tượng', raw);
}

export function auditResultLabel(result: string | null | undefined): string {
  const raw = safeText(result);
  return AUDIT_RESULT_LABELS[raw as AuditResult] ?? unsupportedLabel('Kết quả kiểm toán', raw);
}

export function actorTypeLabel(actorType: string | null | undefined): string {
  const raw = safeText(actorType);
  return ACTOR_TYPE_LABELS[raw as ActorType] ?? unsupportedLabel('Loại tác nhân', raw);
}

export function exceptionStateLabel(state: string | null | undefined): string {
  const raw = safeText(state);
  return (
    EXCEPTION_STATE_LABELS[raw as ExceptionState] ?? unsupportedLabel('Trạng thái ngoại lệ', raw)
  );
}

export function exceptionSeverityLabel(severity: string | null | undefined): string {
  const raw = safeText(severity);
  return (
    EXCEPTION_SEVERITY_LABELS[raw as ControlExceptionSeverity] ?? unsupportedLabel('Mức độ', raw)
  );
}

export function exceptionActionLabel(action: string | null | undefined): string {
  const raw = safeText(action);
  return (
    EXCEPTION_ACTION_LABELS[raw as ExceptionAction] ?? unsupportedLabel('Hành động ngoại lệ', raw)
  );
}

export function exceptionSubStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Chưa có';
  return (
    EXCEPTION_SUB_STATUS_LABELS[status as ExceptionSubStatus] ??
    unsupportedLabel('Trạng thái phụ', status)
  );
}

export function exceptionOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return 'Chưa có';
  return (
    EXCEPTION_OUTCOME_LABELS[outcome as ExceptionOutcome] ??
    unsupportedLabel('Kết quả xử lý', outcome)
  );
}

export function actorDisplayName(actorUserId: string | null, actorType: ActorType): string {
  return actorUserId?.trim() || actorTypeLabel(actorType);
}

export function objectReferenceLabel(
  objectType: string | null | undefined,
  objectCodeOrId: string | null | undefined,
): string {
  const typeLabel = complianceObjectTypeLabel(objectType);
  const reference = objectCodeOrId?.trim();
  return reference ? `${typeLabel} · ${reference}` : typeLabel;
}

export function objectReferenceLabelFromParts(
  objectType: string | null | undefined,
  objectCode: string | null | undefined,
  objectId: string | null | undefined,
): string {
  return objectReferenceLabel(objectType, firstNonBlankText(objectCode, objectId));
}

export function businessReferenceLabel(
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
