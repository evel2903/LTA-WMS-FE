import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Replenishment/Presentation/Pages/ReplenishmentDetailPage', () => ({
  ReplenishmentCreatePage: () => null,
  ReplenishmentDetailPage: () => null,
}));

vi.mock('@modules/Replenishment/Presentation/Pages/ReplenishmentPage', () => ({
  ReplenishmentPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { replenishmentRoutes } from '@modules/Replenishment/Presentation/Routes/ReplenishmentRoutes';

describe('replenishmentRoutes', () => {
  it('registers list, create, detail, and action routes for replenishment', () => {
    expect(replenishmentRoutes.map((route) => route.path)).toEqual([
      ROUTES.REPLENISHMENT.ROOT,
      ROUTES.REPLENISHMENT.NEW,
      ROUTES.REPLENISHMENT.DETAIL(),
      ROUTES.REPLENISHMENT.ACTION(),
    ]);
  });
});
