import { Badge } from '@shared/Components/Ui/Badge';
import type { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';
import { CONTROL_MODE_LABELS } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';

type Variant = 'default' | 'secondary' | 'outline' | 'success' | 'warning';

/** A distinct visual per control mode (architecture 5.4); the four are never merged. */
const MODE_VARIANT: Record<RuleControlMode, Variant> = {
  HARD_BLOCK: 'warning',
  APPROVAL_REQUIRED: 'default',
  SOFT_WARNING: 'secondary',
  AUTO_SUGGESTION: 'outline',
};

export function ControlModeBadge({ mode }: { mode: RuleControlMode }) {
  return <Badge variant={MODE_VARIANT[mode]}>{CONTROL_MODE_LABELS[mode]}</Badge>;
}
