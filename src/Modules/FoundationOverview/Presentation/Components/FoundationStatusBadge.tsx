import { Badge } from '@shared/Components/Ui/Badge';
import type { FoundationReadinessStatus } from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';

const LABEL: Record<FoundationReadinessStatus, string> = {
  ready: 'Sẵn sàng',
  warning: 'Cần kiểm tra',
  missing: 'Thiếu cấu hình',
  error: 'Lỗi cấu hình',
};

const VARIANT: Record<
  FoundationReadinessStatus,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'
> = {
  ready: 'success',
  warning: 'warning',
  missing: 'destructive',
  error: 'destructive',
};

export function FoundationStatusBadge({ status }: { status: FoundationReadinessStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
