import { Badge } from '@shared/Components/Ui/Badge';
import {
  EXCEPTION_STATE_LABELS,
  type ExceptionState,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';

const VARIANT: Record<ExceptionState, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  DETECTED: 'warning',
  LOGGED: 'secondary',
  ASSIGNED: 'secondary',
  IN_REVIEW_PENDING_APPROVAL: 'default',
  RESOLVED: 'success',
  CLOSED: 'outline',
};

export function ExceptionStateBadge({ state }: { state: ExceptionState }) {
  return <Badge variant={VARIANT[state]}>{EXCEPTION_STATE_LABELS[state]}</Badge>;
}
