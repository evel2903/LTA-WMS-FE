import { useQuery } from '@tanstack/react-query';

import { warehouseProfileQueryKeys } from '@modules/WarehouseProfile/Application/Queries/WarehouseProfileQueryKeys';
import { warehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance';

/**
 * Mounts a detail query for the selected profile under
 * `warehouseProfileQueryKeys.profileDetail(id)`. This is what makes the detail
 * panel / lifecycle actions reactive: mutations (activate / deactivate / update)
 * invalidate that exact key, so the panel re-fetches and reflects the new status
 * IMMEDIATELY without the user re-selecting the row (Finding #1). Disabled when no
 * profile is selected.
 */
export function useWarehouseProfileDetail(profileId: string | null) {
  return useQuery({
    queryKey: warehouseProfileQueryKeys.profileDetail(profileId ?? ''),
    queryFn: () => warehouseProfileRepository.getProfile(profileId ?? ''),
    enabled: Boolean(profileId),
  });
}
