import { Badge } from '@shared/Components/Ui/Badge';
import {
  APPROVAL_DECISION_LABELS,
  type ApprovalDecision,
} from '@modules/Approval/Domain/Enums/ApprovalEnums';

const VARIANT: Record<ApprovalDecision, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'outline',
};

export function ApprovalDecisionBadge({ decision }: { decision: ApprovalDecision }) {
  return <Badge variant={VARIANT[decision]}>{APPROVAL_DECISION_LABELS[decision]}</Badge>;
}
