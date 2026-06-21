import { Badge } from '@shared/Components/Ui/Badge';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';

export function LocationProfileStatusBadge({ status }: { status: MasterDataStatus }) {
  return <Badge variant={status === 'Active' ? 'success' : 'secondary'}>{status}</Badge>;
}
