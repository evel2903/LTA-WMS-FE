import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Packing/Presentation/Pages/PackingDetailPage', () => ({
  PackingCreatePage: () => null,
  PackingDetailPage: () => null,
}));

vi.mock('@modules/Packing/Presentation/Pages/PackingPage', () => ({
  PackingPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { packingRoutes } from '@modules/Packing/Presentation/Routes/PackingRoutes';

describe('packingRoutes', () => {
  it('registers list, create, detail and action routes for package workflow', () => {
    expect(packingRoutes.map((route) => route.path)).toEqual([
      ROUTES.PACKING.ROOT,
      ROUTES.PACKING.NEW,
      ROUTES.PACKING.DETAIL(),
      ROUTES.PACKING.ACTION(),
    ]);
    expect(ROUTES.PACKING.ACTION('package-1', 'ready-for-staging')).toBe(
      '/packing/package-1/ready-for-staging',
    );
  });
});
