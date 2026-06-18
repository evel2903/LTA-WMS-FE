import { Badge } from '@shared/Components/Ui/Badge';
import type { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

type Variant = 'success' | 'warning' | 'secondary' | 'outline';

const STATUS_META: Record<WarehouseProfileStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'success' },
  EXPIRED: { label: 'Expired', variant: 'warning' },
  RETIRED: { label: 'Retired', variant: 'secondary' },
};

export function WarehouseProfileStatusBadge({ status }: { status: WarehouseProfileStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
