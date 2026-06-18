import { Badge } from '@shared/Components/Ui/Badge';
import type {
  LocationStatus,
  MasterDataStatus,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';

interface MasterDataStatusBadgeProps {
  status: MasterDataStatus | LocationStatus;
}

export function MasterDataStatusBadge({ status }: MasterDataStatusBadgeProps) {
  return <Badge variant={masterDataStatusVariant(status)}>{status}</Badge>;
}
