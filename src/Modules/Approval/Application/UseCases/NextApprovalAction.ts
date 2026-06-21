import type { ApprovalDecision } from '@modules/Approval/Domain/Enums/ApprovalEnums';

/**
 * Whether an approval request can still be decided. Unlike the linear Exception lifecycle,
 * Approval is a SINGLE branch point: from PENDING the reviewer chooses Approve OR Reject;
 * APPROVED and REJECTED are both terminal. Returns 'Decide' when actionable, else null. Pure.
 */
export function nextApprovalAction(decision: ApprovalDecision): 'Decide' | null {
  return decision === 'PENDING' ? 'Decide' : null;
}
