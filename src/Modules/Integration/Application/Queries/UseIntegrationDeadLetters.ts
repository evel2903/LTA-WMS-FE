import { useQuery } from '@tanstack/react-query';
import { integrationQueryKeys } from '@modules/Integration/Application/Queries/IntegrationQueryKeys';
import type { IntegrationListFilter } from '@modules/Integration/Domain/Types/IntegrationQuery';
import { integrationRepository } from '@modules/Integration/Infrastructure/Repositories/IntegrationRepositoryInstance';

export function useIntegrationDeadLetters(filter: IntegrationListFilter = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: integrationQueryKeys.deadLetters(filter),
    queryFn: () => integrationRepository.listDeadLetters(filter),
    enabled: options.enabled ?? true,
  });
}

export function useIntegrationDeadLetter(id: string | null) {
  return useQuery({
    queryKey: integrationQueryKeys.deadLetter(id ?? ''),
    queryFn: () => integrationRepository.getDeadLetter(id as string),
    enabled: Boolean(id),
  });
}
