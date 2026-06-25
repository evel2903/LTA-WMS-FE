import type {
  IntegrationListFilter,
  ReconciliationItemFilter,
  ReconciliationRunFilter,
} from '@modules/Integration/Domain/Types/IntegrationQuery';

export const integrationQueryKeys = {
  all: ['integration'] as const,
  deadLetters: (filter: IntegrationListFilter = {}) =>
    [...integrationQueryKeys.all, 'dead-letters', filter] as const,
  deadLetter: (id: string) => [...integrationQueryKeys.all, 'dead-letter', id] as const,
  reconciliationRuns: (filter: ReconciliationRunFilter = {}) =>
    [...integrationQueryKeys.all, 'reconciliation-runs', filter] as const,
  reconciliationRun: (id: string) => [...integrationQueryKeys.all, 'reconciliation-run', id] as const,
  reconciliationItems: (runId: string, filter: ReconciliationItemFilter = {}) =>
    [...integrationQueryKeys.all, 'reconciliation-items', runId, filter] as const,
};
