import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { inboundRoutes } from '@modules/Inbound/Presentation/Routes/InboundRoutes';

describe('Inbound routes', () => {
  it('registers root, create, detail and action routes', () => {
    expect(ROUTES.INBOUND.ROOT).toBe('/inbound');
    expect(inboundRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '/inbound',
        '/inbound/new',
        '/inbound/:id',
        '/inbound/:id/:action',
      ]),
    );
  });
});
