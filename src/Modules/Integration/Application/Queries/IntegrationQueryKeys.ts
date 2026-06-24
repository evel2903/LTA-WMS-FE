import type { IntegrationListFilter } from '@modules/Integration/Domain/Types/IntegrationQuery';

export const integrationQueryKeys = {
  all: ['integration'] as const,
  deadLetters: (filter: IntegrationListFilter = {}) =>
    [...integrationQueryKeys.all, 'dead-letters', filter] as const,
  deadLetter: (id: string) => [...integrationQueryKeys.all, 'dead-letter', id] as const,
};
