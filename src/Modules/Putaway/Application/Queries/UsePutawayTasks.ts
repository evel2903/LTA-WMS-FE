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

export function usePutawayTask(id: string | null) {
  return useQuery({
    queryKey: putawayQueryKeys.detail(id ?? ''),
    queryFn: () => putawayRepository.getById(id as string),
    enabled: Boolean(id),
  });
}
