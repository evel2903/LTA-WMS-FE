import type {
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

export const VI_SKIPPED_REASON_LABELS: Record<SkippedReason, string> = {
  LOWER_TIER: 'Tầng ưu tiên thấp hơn',
  LESS_SPECIFIC: 'Phạm vi kém cụ thể hơn',
  LOWER_PRIORITY_TIEBREAK: 'Độ ưu tiên thấp hơn khi hòa',
  NEWER_EFFECTIVE_WINS: 'Quy tắc hiệu lực mới hơn thắng',
  SHADOWED_BY_COMPLIANCE_HARD_BLOCK: 'Bị chặn bởi quy tắc tuân thủ chặn cứng',
};

export function viSkippedReasonLabel(reason: SkippedReason): string {
  return VI_SKIPPED_REASON_LABELS[reason] ?? reason;
}
