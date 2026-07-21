import { Badge } from '@shared/Components/Reui/badge';
import { cn } from '@shared/Utils/Cn';
import { ROLE_STATUS_LABELS } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

const ROLE_STATUS_VARIANTS: Record<string, { variant: 'success-light' | 'info-light'; dot: string }> = {
  ACTIVE: { variant: 'success-light', dot: 'bg-success' },
  INACTIVE: { variant: 'info-light', dot: 'bg-muted-foreground' },
};

export function RoleStatusBadge({ status }: { status: string }) {
  const label = ROLE_STATUS_LABELS[status] ?? status;
  const config = ROLE_STATUS_VARIANTS[status] ?? { variant: 'info-light' as const, dot: 'bg-muted-foreground' };

  return (
    <Badge
      variant={config.variant}
      radius="full"
      className="gap-1.5"
      aria-label={`Trạng thái: ${label}`}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', config.dot)} />
      {label}
    </Badge>
  );
}
