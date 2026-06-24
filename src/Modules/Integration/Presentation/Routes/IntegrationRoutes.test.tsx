import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Integration/Presentation/Pages/IntegrationDeadLetterDetailPage', () => ({
  IntegrationDeadLetterDetailPage: () => null,
}));

vi.mock('@modules/Integration/Presentation/Pages/IntegrationPage', () => ({
  IntegrationPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { integrationRoutes } from '@modules/Integration/Presentation/Routes/IntegrationRoutes';

describe('integrationRoutes', () => {
  it('registers list, detail and action routes for dead-letter handling', () => {
    expect(integrationRoutes.map((route) => route.path)).toEqual([
      ROUTES.INTEGRATION.ROOT,
      ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(),
      ROUTES.INTEGRATION.DEAD_LETTER_ACTION(),
    ]);
    expect(ROUTES.INTEGRATION.DEAD_LETTER_ACTION('outbox-1', 'retry')).toBe(
      '/integration/dead-letters/outbox-1/retry',
    );
  });
});
