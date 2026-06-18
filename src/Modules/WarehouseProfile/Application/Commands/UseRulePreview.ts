import { useMutation } from '@tanstack/react-query';

import type { PreviewContextInput } from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileInputs';
import { warehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance';

/**
 * Preview is a read-only simulation but uses a POST body, so it is modelled as a
 * mutation (no cache key). The Preview panel renders the returned `RulePreview`
 * directly — FE never resolves anything (architecture 8.2).
 */
export function useRulePreview() {
  return useMutation({
    mutationFn: (context: PreviewContextInput) => warehouseProfileRepository.preview(context),
  });
}
