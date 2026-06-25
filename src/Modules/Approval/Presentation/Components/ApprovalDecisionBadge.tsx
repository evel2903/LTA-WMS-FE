import { Badge } from '@shared/Components/Ui/Badge';
import type { ApprovalDecision } from '@modules/Approval/Domain/Enums/ApprovalEnums';

const VARIANT: Record<ApprovalDecision, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'outline',
};

const DECISION_LABELS_VI: Record<ApprovalDecision, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối',
};

export function ApprovalDecisionBadge({ decision }: { decision: ApprovalDecision }) {
  return <Badge variant={VARIANT[decision]}>{DECISION_LABELS_VI[decision]}</Badge>;
}
