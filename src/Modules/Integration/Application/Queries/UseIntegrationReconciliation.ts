import { useQuery } from '@tanstack/react-query';
import { integrationQueryKeys } from '@modules/Integration/Application/Queries/IntegrationQueryKeys';
import type {
  ReconciliationItemFilter,
  ReconciliationRunFilter,
} from '@modules/Integration/Domain/Types/IntegrationQuery';
import { integrationRepository } from '@modules/Integration/Infrastructure/Repositories/IntegrationRepositoryInstance';

export function useIntegrationReconciliationRuns(
  filter: ReconciliationRunFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: integrationQueryKeys.reconciliationRuns(filter),
    queryFn: () => integrationRepository.listReconciliationRuns(filter),
    enabled: options.enabled ?? true,
  });
}

export function useIntegrationReconciliationRun(id: string | null) {
  return useQuery({
    queryKey: integrationQueryKeys.reconciliationRun(id ?? ''),
    queryFn: () => integrationRepository.getReconciliationRun(id as string),
    enabled: Boolean(id),
  });
}

export function useIntegrationReconciliationItems(
  runId: string | null,
  filter: ReconciliationItemFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: integrationQueryKeys.reconciliationItems(runId ?? '', filter),
    queryFn: () => integrationRepository.listReconciliationItems(runId as string, filter),
    enabled: Boolean(runId) && (options.enabled ?? true),
  });
}
