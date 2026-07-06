import { Badge } from '@shared/Components/Ui/Badge';
import type { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';
import { viControlModeLabel } from '@modules/WarehouseProfile/Presentation/Constants/WarehouseProfileDisplayText';

type Variant = 'default' | 'secondary' | 'outline' | 'success' | 'warning';

/** A distinct visual per control mode (architecture 5.4); the four are never merged. */
const MODE_VARIANT: Record<RuleControlMode, Variant> = {
  HARD_BLOCK: 'warning',
  APPROVAL_REQUIRED: 'default',
  SOFT_WARNING: 'secondary',
  AUTO_SUGGESTION: 'outline',
};

function controlModeVariant(mode: string | null | undefined): Variant {
  return MODE_VARIANT[mode as RuleControlMode] ?? 'outline';
}

export function ControlModeBadge({ mode }: { mode: string | null | undefined }) {
  return <Badge variant={controlModeVariant(mode)}>{viControlModeLabel(mode)}</Badge>;
}
