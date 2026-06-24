import { useQuery } from '@tanstack/react-query';
import { cycleCountQueryKeys } from '@modules/CycleCount/Application/Queries/CycleCountQueryKeys';
import type { CycleCountWorkListFilter } from '@modules/CycleCount/Domain/Types/CycleCountQuery';
import { cycleCountRepository } from '@modules/CycleCount/Infrastructure/Repositories/CycleCountRepositoryInstance';

export function useCycleCountWorks(filter: CycleCountWorkListFilter = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cycleCountQueryKeys.list(filter),
    queryFn: () => cycleCountRepository.list(filter),
    enabled: options.enabled ?? true,
  });
}

export function useCycleCountWork(id: string | null) {
  return useQuery({
    queryKey: cycleCountQueryKeys.detail(id ?? ''),
    queryFn: async () => {
      const result = await cycleCountRepository.getById(id as string);
      return result.cycleCountWork;
    },
    enabled: Boolean(id),
  });
}
