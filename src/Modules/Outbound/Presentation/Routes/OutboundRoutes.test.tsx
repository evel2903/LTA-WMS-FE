import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Outbound/Presentation/Pages/OutboundDetailPage', () => ({
  OutboundCreatePage: () => null,
  OutboundDetailPage: () => null,
}));

vi.mock('@modules/Outbound/Presentation/Pages/OutboundPage', () => ({
  OutboundPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { outboundRoutes } from '@modules/Outbound/Presentation/Routes/OutboundRoutes';

describe('outboundRoutes', () => {
  it('registers list, create, detail and action routes for outbound orders', () => {
    expect(outboundRoutes.map((route) => route.path)).toEqual([
      ROUTES.OUTBOUND.ROOT,
      ROUTES.OUTBOUND.NEW,
      ROUTES.OUTBOUND.DETAIL(),
      ROUTES.OUTBOUND.ACTION(),
    ]);
    expect(ROUTES.OUTBOUND.ACTION('outbound-1', 'hold')).toBe('/outbound/outbound-1/hold');
    expect(ROUTES.OUTBOUND.ACTION('outbound-1', 'allocate')).toBe('/outbound/outbound-1/allocate');
  });
});
