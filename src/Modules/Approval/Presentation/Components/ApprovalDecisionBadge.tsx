import { Badge } from '@shared/Components/Ui/Badge';
import type { ApprovalDecision } from '@modules/Approval/Domain/Enums/ApprovalEnums';
import { approvalDecisionLabel } from '@modules/Approval/Presentation/Constants/ApprovalDisplayText';

const VARIANT: Record<ApprovalDecision, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'outline',
};

export function ApprovalDecisionBadge({ decision }: { decision: ApprovalDecision }) {
  return <Badge variant={VARIANT[decision]}>{approvalDecisionLabel(decision)}</Badge>;
}
