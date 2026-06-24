import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Shipping/Presentation/Pages/ShippingDetailPage', () => ({
  ShippingCreatePage: () => null,
  ShippingDetailPage: () => null,
}));

vi.mock('@modules/Shipping/Presentation/Pages/ShippingPage', () => ({
  ShippingPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { shippingRoutes } from '@modules/Shipping/Presentation/Routes/ShippingRoutes';

describe('shippingRoutes', () => {
  it('registers list, create, detail and action routes for package staging', () => {
    expect(shippingRoutes.map((route) => route.path)).toEqual([
      ROUTES.SHIPPING.ROOT,
      ROUTES.SHIPPING.NEW,
      ROUTES.SHIPPING.DETAIL(),
      ROUTES.SHIPPING.ACTION(),
    ]);
    expect(ROUTES.SHIPPING.ACTION('staging-1', 'truck')).toBe('/shipping/staging-1/truck');
  });
});
