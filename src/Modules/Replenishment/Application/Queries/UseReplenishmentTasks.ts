import { useQuery } from '@tanstack/react-query';
import { replenishmentQueryKeys } from '@modules/Replenishment/Application/Queries/ReplenishmentQueryKeys';
import type { ReplenishmentTaskListFilter } from '@modules/Replenishment/Domain/Types/ReplenishmentQuery';
import { replenishmentRepository } from '@modules/Replenishment/Infrastructure/Repositories/ReplenishmentRepositoryInstance';

export function useReplenishmentTasks(filter: ReplenishmentTaskListFilter = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: replenishmentQueryKeys.list(filter),
    queryFn: () => replenishmentRepository.list(filter),
    enabled: options.enabled ?? true,
  });
}
