import { Badge } from '@shared/Components/Ui/Badge';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import { displayMasterDataStatus } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';

interface MasterDataStatusBadgeProps {
  status: string | null | undefined;
}

export function MasterDataStatusBadge({ status }: MasterDataStatusBadgeProps) {
  return <Badge variant={masterDataStatusVariant(status)}>{displayMasterDataStatus(status)}</Badge>;
}
