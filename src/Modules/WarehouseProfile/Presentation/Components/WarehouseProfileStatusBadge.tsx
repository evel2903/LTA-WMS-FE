import { Badge } from '@shared/Components/Ui/Badge';
import type { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

type Variant = 'success' | 'warning' | 'secondary' | 'outline';

const STATUS_META: Record<WarehouseProfileStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: 'Bản nháp', variant: 'outline' },
  ACTIVE: { label: 'Đang hoạt động', variant: 'success' },
  EXPIRED: { label: 'Hết hiệu lực', variant: 'warning' },
  RETIRED: { label: 'Ngưng sử dụng', variant: 'secondary' },
};

export function WarehouseProfileStatusBadge({ status }: { status: WarehouseProfileStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
