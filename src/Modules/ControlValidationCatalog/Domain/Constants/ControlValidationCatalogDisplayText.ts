import type {
  CatalogImplementationStatus,
  ControlExceptionDefaultState,
  ControlExceptionSeverity,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';

const NOT_APPLICABLE_LABEL = 'Không áp dụng';
const UNKNOWN_LABEL = 'Không xác định';

const ACTION_ALLOWED_LABELS: Record<string, string> = {
  Block: 'Chặn',
  Escalate: 'Leo thang',
  RequireSpecialApproval: 'Yêu cầu phê duyệt đặc biệt',
  RequireVersionAudit: 'Yêu cầu kiểm toán phiên bản',
  RouteToOtherApprover: 'Chuyển người phê duyệt khác',
  Warn: 'Cảnh báo',
};

const CATEGORY_LABELS: Record<string, string> = {
  ApprovalTimeout: 'Quá hạn phê duyệt',
  AuthorizationDenied: 'Từ chối phân quyền',
  ComplianceOverride: 'Ghi đè kiểm soát tuân thủ',
  ConfigVersioning: 'Kiểm soát phiên bản cấu hình',
  DataScopeViolation: 'Vi phạm phạm vi dữ liệu',
  ExceptionClosure: 'Đóng ngoại lệ',
  ManualDataFix: 'Sửa dữ liệu thủ công',
  OverrideFrequency: 'Tần suất ghi đè bất thường',
  SegregationOfDuties: 'Tách nhiệm vụ',
};

const IMPLEMENTATION_STATUS_LABELS: Record<CatalogImplementationStatus, string> = {
  Implemented: 'Đã triển khai',
  DeferredToC9: 'Dời sang C9',
  DeferredV1Plus: 'Hoãn sau V1',
};

const SEVERITY_LABELS: Record<ControlExceptionSeverity, string> = {
  High: 'Cao',
  Medium: 'Trung bình',
};

const DEFAULT_STATE_LABELS: Record<ControlExceptionDefaultState, string> = {
  Blocked: 'Chặn',
  Detected: 'Ghi nhận',
  Escalated: 'Leo thang',
  Warned: 'Cảnh báo',
};

function valueOrNa(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || NOT_APPLICABLE_LABEL;
}

function valueOrUnknown(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || UNKNOWN_LABEL;
}

export function controlActionAllowedLabel(value: string | null | undefined): string {
  const rawValue = valueOrNa(value);
  return ACTION_ALLOWED_LABELS[rawValue] ?? rawValue;
}

export function controlCategoryLabel(value: string | null | undefined): string {
  const rawValue = valueOrNa(value);
  return CATEGORY_LABELS[rawValue] ?? rawValue;
}

export function catalogImplementationStatusLabel(status: string | null | undefined): string {
  const rawValue = valueOrUnknown(status);
  return IMPLEMENTATION_STATUS_LABELS[rawValue as CatalogImplementationStatus] ?? rawValue;
}

export function controlSeverityLabel(severity: string | null | undefined): string {
  const rawValue = valueOrUnknown(severity);
  return SEVERITY_LABELS[rawValue as ControlExceptionSeverity] ?? rawValue;
}

export function controlDefaultStateLabel(state: string | null | undefined): string {
  const rawValue = valueOrUnknown(state);
  return DEFAULT_STATE_LABELS[rawValue as ControlExceptionDefaultState] ?? rawValue;
}

export function requirementLabel(value: boolean | null | undefined): string {
  if (value === true) return 'bắt buộc';
  if (value === false) return 'không bắt buộc';
  return UNKNOWN_LABEL;
}
