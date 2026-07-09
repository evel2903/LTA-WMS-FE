import { cn } from '@shared/Utils/Cn';
import { Badge } from '@shared/Components/Reui/badge';
import type { BadgeVariantProps } from '@shared/Components/Reui/badgeVariants';
import { MASTER_DATA_STATUS_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';

const STATUS_BADGE_CONFIG: Record<string, { variant: BadgeVariantProps['variant']; dotClassName: string }> = {
  Active: { variant: 'success-light', dotClassName: 'bg-success' },
  Inactive: { variant: 'info-light', dotClassName: 'bg-muted-foreground' },
  Maintenance: { variant: 'warning-light', dotClassName: 'bg-warning' },
  Blocked: { variant: 'destructive-light', dotClassName: 'bg-destructive' },
};

/**
 * Status pill matching the new design: light-tint badge + small colored dot,
 * instead of the plain solid-color Badge previously used across MasterData tables.
 */
export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_CONFIG[status] ?? { variant: 'outline' as const, dotClassName: 'bg-muted-foreground' };
  const label = MASTER_DATA_STATUS_LABELS[status as keyof typeof MASTER_DATA_STATUS_LABELS] ?? status;

  return (
    <Badge variant={config.variant} radius="full" className="gap-1.5">
      <span className={cn('size-1.5 rounded-full', config.dotClassName)} />
      {label}
    </Badge>
  );
}
