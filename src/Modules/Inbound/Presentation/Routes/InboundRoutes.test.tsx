import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { inboundRoutes } from '@modules/Inbound/Presentation/Routes/InboundRoutes';

describe('Inbound routes', () => {
  it('registers root, create, detail, action and discrepancy routes', () => {
    expect(ROUTES.INBOUND.ROOT).toBe('/inbound');
    expect(ROUTES.INBOUND.DISCREPANCY('plan-1', 'line-1')).toBe(
      '/inbound/plan-1/discrepancy/line-1',
    );
    expect(inboundRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '/inbound',
        '/inbound/new',
        '/inbound/:id',
        '/inbound/:id/discrepancy/:lineId',
        '/inbound/:id/:action',
      ]),
    );
  });
});
