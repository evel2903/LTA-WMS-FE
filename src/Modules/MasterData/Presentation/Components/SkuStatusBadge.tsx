import { Badge } from '@shared/Components/Ui/Badge';
import { skuStatusVariant } from '@modules/MasterData/Presentation/Components/SkuStatusVariant';
import { displaySkuStatus } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';

interface SkuStatusBadgeProps {
  status: string | null | undefined;
}

export function SkuStatusBadge({ status }: SkuStatusBadgeProps) {
  return <Badge variant={skuStatusVariant(status)}>{displaySkuStatus(status)}</Badge>;
}
