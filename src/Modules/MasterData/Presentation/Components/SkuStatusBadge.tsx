import { Badge } from '@shared/Components/Ui/Badge';
import { skuStatusVariant } from '@modules/MasterData/Presentation/Components/SkuStatusVariant';
import type { SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';

interface SkuStatusBadgeProps {
  status: SkuStatus;
}

export function SkuStatusBadge({ status }: SkuStatusBadgeProps) {
  return <Badge variant={skuStatusVariant(status)}>{status}</Badge>;
}
