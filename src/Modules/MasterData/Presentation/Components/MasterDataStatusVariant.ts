import type {
  LocationStatus,
  MasterDataStatus,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';

/** Badge variants used to represent master-data / location statuses. */
export type StatusBadgeVariant = 'success' | 'warning' | 'secondary' | 'outline';

/** Maps each known status to a distinct badge variant (Inactive is no longer lumped with the fallback). */
export function masterDataStatusVariant(
  status: MasterDataStatus | LocationStatus,
): StatusBadgeVariant {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Blocked':
    case 'Maintenance':
      return 'warning';
    case 'Inactive':
      return 'secondary';
    default:
      return 'outline';
  }
}
