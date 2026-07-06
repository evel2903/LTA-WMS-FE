import type {
  AssignmentType,
  RuleControlMode,
  RulePrecedenceTier,
  SkippedReason,
} from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

export const VI_PRECEDENCE_TIER_LABELS: Record<RulePrecedenceTier, string> = {
  COMPLIANCE: 'Tuân thủ',
  INTEGRITY: 'Toàn vẹn',
  PHYSICAL: 'Vật lý',
  OWNER_CONTRACT: 'Chủ hàng / Hợp đồng',
  OPERATION: 'Vận hành',
  OPTIMIZATION: 'Tối ưu',
};

export const VI_PRECEDENCE_TIER_DESCRIPTIONS: Record<RulePrecedenceTier, string> = {
  COMPLIANCE: 'Quy tắc pháp lý / an toàn. Ưu tiên cao nhất; chặn cứng luôn thắng.',
  INTEGRITY: 'Ràng buộc toàn vẹn dữ liệu và tồn kho.',
  PHYSICAL: 'Giới hạn sức chứa vật lý / khả năng vị trí.',
  OWNER_CONTRACT: 'Yêu cầu xử lý theo chủ hàng và hợp đồng.',
  OPERATION: 'Ưu tiên quy trình vận hành.',
  OPTIMIZATION: 'Gợi ý tối ưu; ưu tiên thấp nhất.',
};

export const VI_CONTROL_MODE_LABELS: Record<RuleControlMode, string> = {
  HARD_BLOCK: 'Chặn cứng',
  APPROVAL_REQUIRED: 'Yêu cầu phê duyệt',
  SOFT_WARNING: 'Cảnh báo mềm',
  AUTO_SUGGESTION: 'Gợi ý tự động',
};

export const VI_ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  WAREHOUSE_TYPE: 'Loại kho',
  WAREHOUSE: 'Kho cụ thể',
};

export const VI_SKIPPED_REASON_LABELS: Record<SkippedReason, string> = {
  LOWER_TIER: 'Tầng ưu tiên thấp hơn',
  LESS_SPECIFIC: 'Phạm vi kém cụ thể hơn',
  LOWER_PRIORITY_TIEBREAK: 'Độ ưu tiên thấp hơn khi hòa',
  NEWER_EFFECTIVE_WINS: 'Quy tắc hiệu lực mới hơn thắng',
  SHADOWED_BY_COMPLIANCE_HARD_BLOCK: 'Bị chặn bởi quy tắc tuân thủ chặn cứng',
};

function rawEnumFallback(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function unsupportedValueLabel(
  value: string | null | undefined,
  label: string,
  emptyLabel = 'Chưa xác định',
): string {
  const normalized = rawEnumFallback(value);
  return normalized ? `${label} chưa hỗ trợ (${normalized})` : emptyLabel;
}

export function viPrecedenceTierLabel(tier: string | null | undefined): string {
  const normalized = rawEnumFallback(tier);
  if (!normalized) return 'Chưa xác định';
  return (
    VI_PRECEDENCE_TIER_LABELS[normalized as RulePrecedenceTier] ??
    unsupportedValueLabel(normalized, 'Tầng ưu tiên')
  );
}

export function viPrecedenceTierDescription(tier: string | null | undefined): string {
  const normalized = rawEnumFallback(tier);
  if (!normalized) return 'Chưa có mô tả tầng ưu tiên.';
  return (
    VI_PRECEDENCE_TIER_DESCRIPTIONS[normalized as RulePrecedenceTier] ??
    'Tầng ưu tiên này chưa có trong mapping hiển thị của FE.'
  );
}

export function viControlModeLabel(mode: string | null | undefined): string {
  const normalized = rawEnumFallback(mode);
  if (!normalized) return 'Chưa xác định';
  return (
    VI_CONTROL_MODE_LABELS[normalized as RuleControlMode] ??
    unsupportedValueLabel(normalized, 'Chế độ kiểm soát')
  );
}

export function viAssignmentTypeLabel(type: string | null | undefined): string {
  const normalized = rawEnumFallback(type);
  if (!normalized) return 'Chưa xác định';
  return (
    VI_ASSIGNMENT_TYPE_LABELS[normalized as AssignmentType] ??
    unsupportedValueLabel(normalized, 'Loại gán')
  );
}

export function viSkippedReasonLabel(reason: string | null | undefined): string {
  const normalized = rawEnumFallback(reason);
  if (!normalized) return 'Chưa xác định';
  return (
    VI_SKIPPED_REASON_LABELS[normalized as SkippedReason] ??
    unsupportedValueLabel(normalized, 'Lý do bỏ qua')
  );
}
