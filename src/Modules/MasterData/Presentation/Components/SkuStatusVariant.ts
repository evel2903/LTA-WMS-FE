import type { StatusBadgeVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import type { SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';

/** Maps each SKU lifecycle status to a distinct badge variant. */
export function skuStatusVariant(status: SkuStatus): StatusBadgeVariant {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Draft':
      return 'outline';
    case 'Blocked':
      return 'warning';
    case 'Discontinued':
      return 'secondary';
    default:
      return 'outline';
  }
}
