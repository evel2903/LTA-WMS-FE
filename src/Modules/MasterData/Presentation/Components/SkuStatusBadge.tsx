import { cn } from '@shared/Utils/Cn';
import { Badge } from '@shared/Components/Reui/badge';
import type { BadgeVariantProps } from '@shared/Components/Reui/badgeVariants';
import { displaySkuStatus } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import type { SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';

const SKU_STATUS_BADGE_CONFIG: Record<SkuStatus, { variant: BadgeVariantProps['variant']; dotClassName: string }> = {
  Draft: { variant: 'outline', dotClassName: 'bg-muted-foreground' },
  Active: { variant: 'success-light', dotClassName: 'bg-success' },
  Blocked: { variant: 'destructive-light', dotClassName: 'bg-destructive' },
  Discontinued: { variant: 'invert-light', dotClassName: 'bg-muted-foreground' },
};

interface SkuStatusBadgeProps {
  status: string | null | undefined;
}

export function SkuStatusBadge({ status }: SkuStatusBadgeProps) {
  const config = SKU_STATUS_BADGE_CONFIG[status as SkuStatus] ?? {
    variant: 'outline' as const,
    dotClassName: 'bg-muted-foreground',
  };

  return (
    <Badge variant={config.variant} radius="full" className="gap-1.5">
      <span className={cn('size-1.5 rounded-full', config.dotClassName)} />
      {displaySkuStatus(status)}
    </Badge>
  );
}
