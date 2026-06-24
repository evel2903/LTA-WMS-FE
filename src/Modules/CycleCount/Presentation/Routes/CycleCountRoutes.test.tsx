import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/CycleCount/Presentation/Pages/CycleCountDetailPage', () => ({
  CycleCountCreatePage: () => null,
  CycleCountDetailPage: () => null,
}));

vi.mock('@modules/CycleCount/Presentation/Pages/CycleCountPage', () => ({
  CycleCountPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { cycleCountRoutes } from '@modules/CycleCount/Presentation/Routes/CycleCountRoutes';

describe('cycleCountRoutes', () => {
  it('registers list, create, detail, and action routes for cycle count', () => {
    expect(cycleCountRoutes.map((route) => route.path)).toEqual([
      ROUTES.CYCLE_COUNT.ROOT,
      ROUTES.CYCLE_COUNT.NEW,
      ROUTES.CYCLE_COUNT.DETAIL(),
      ROUTES.CYCLE_COUNT.ACTION(),
    ]);
  });
});
