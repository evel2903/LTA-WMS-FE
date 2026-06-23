import { useQuery } from '@tanstack/react-query';
import { putawayQueryKeys } from '@modules/Putaway/Application/Queries/PutawayQueryKeys';
import type { PutawayTaskListFilter } from '@modules/Putaway/Domain/Types/PutawayTaskQuery';
import { putawayRepository } from '@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance';

export function usePutawayTasks(filter: PutawayTaskListFilter = {}) {
  return useQuery({
    queryKey: putawayQueryKeys.list(filter),
    queryFn: () => putawayRepository.list(filter),
  });
}
