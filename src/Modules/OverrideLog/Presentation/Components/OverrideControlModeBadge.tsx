import { Badge } from '@shared/Components/Ui/Badge';
import {
  RULE_CONTROL_MODE_LABELS,
  type RuleControlMode,
} from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';

const VARIANT: Record<RuleControlMode, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  HARD_BLOCK: 'destructive',
  APPROVAL_REQUIRED: 'warning',
  SOFT_WARNING: 'secondary',
  AUTO_SUGGESTION: 'outline',
};

export function OverrideControlModeBadge({ mode }: { mode: RuleControlMode }) {
  return <Badge variant={VARIANT[mode]}>{RULE_CONTROL_MODE_LABELS[mode]}</Badge>;
}
