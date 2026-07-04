import { Badge } from '@shared/Components/Ui/Badge';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';

function statusLabel(status: MasterDataStatus): string {
  switch (status) {
    case 'Active':
      return 'Đang hoạt động';
    case 'Inactive':
      return 'Không hoạt động';
    default:
      return status;
  }
}

export function LocationProfileStatusBadge({ status }: { status: MasterDataStatus }) {
  return <Badge variant={masterDataStatusVariant(status)}>{statusLabel(status)}</Badge>;
}
