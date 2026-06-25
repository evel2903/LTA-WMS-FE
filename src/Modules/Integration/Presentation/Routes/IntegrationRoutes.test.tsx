import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Integration/Presentation/Pages/IntegrationDeadLetterDetailPage', () => ({
  IntegrationDeadLetterDetailPage: () => null,
}));

vi.mock('@modules/Integration/Presentation/Pages/IntegrationPage', () => ({
  IntegrationPage: () => null,
}));

vi.mock('@modules/Integration/Presentation/Pages/IntegrationReconciliationPage', () => ({
  IntegrationReconciliationPage: () => null,
}));

vi.mock('@modules/Integration/Presentation/Pages/IntegrationReconciliationDetailPage', () => ({
  IntegrationReconciliationDetailPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { integrationRoutes } from '@modules/Integration/Presentation/Routes/IntegrationRoutes';

describe('integrationRoutes', () => {
  it('registers list, detail and action routes for dead-letter handling', () => {
    expect(integrationRoutes.map((route) => route.path)).toEqual([
      ROUTES.INTEGRATION.ROOT,
      ROUTES.INTEGRATION.RECONCILIATION,
      ROUTES.INTEGRATION.RECONCILIATION_DETAIL(),
      ROUTES.INTEGRATION.RECONCILIATION_ACTION(),
      ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(),
      ROUTES.INTEGRATION.DEAD_LETTER_ACTION(),
    ]);
    expect(ROUTES.INTEGRATION.DEAD_LETTER_ACTION('outbox-1', 'retry')).toBe(
      '/integration/dead-letters/outbox-1/retry',
    );
    expect(ROUTES.INTEGRATION.RECONCILIATION_DETAIL('run-1')).toBe('/integration/reconciliation/run-1');
    expect(ROUTES.INTEGRATION.RECONCILIATION_ACTION('run-1', 'resolve')).toBe(
      '/integration/reconciliation/run-1/resolve',
    );
  });
});
