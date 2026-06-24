import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/OverrideLog/Presentation/Pages/OverrideLogPage', () => ({
  OverrideLogPage: () => null,
}));

vi.mock('@modules/OverrideLog/Presentation/Pages/OverrideLogDetailPage', () => ({
  OverrideLogDetailPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { overrideLogRoutes } from '@modules/OverrideLog/Presentation/Routes/OverrideLogRoutes';

describe('overrideLogRoutes', () => {
  it('registers override list and detail routes', () => {
    expect(overrideLogRoutes.map((route) => route.path)).toEqual([
      ROUTES.FOUNDATION.OVERRIDES,
      ROUTES.FOUNDATION.OVERRIDE_DETAIL(),
    ]);
  });

  it('keeps route pattern params literal and encodes concrete override ids', () => {
    expect(ROUTES.FOUNDATION.OVERRIDE_DETAIL()).toBe('/foundation/overrides/:id');
    expect(ROUTES.FOUNDATION.OVERRIDE_DETAIL('override/a?#1')).toBe(
      '/foundation/overrides/override%2Fa%3F%231',
    );
    expect(ROUTES.FOUNDATION.OVERRIDE_DETAIL(':tenant/a?#1')).toBe(
      '/foundation/overrides/%3Atenant%2Fa%3F%231',
    );
  });
});
