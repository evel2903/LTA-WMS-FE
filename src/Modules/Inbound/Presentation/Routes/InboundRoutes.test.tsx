import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { inboundRoutes } from '@modules/Inbound/Presentation/Routes/InboundRoutes';

describe('Inbound routes', () => {
  it('registers the real inbound route on /inbound', () => {
    expect(ROUTES.INBOUND.ROOT).toBe('/inbound');
    expect(inboundRoutes.map((route) => route.path)).toContain('/inbound');
  });
});
