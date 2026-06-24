import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { putawayRoutes } from '@modules/Putaway/Presentation/Routes/PutawayRoutes';

describe('Putaway routes', () => {
  it('registers root, detail and action routes', () => {
    expect(ROUTES.PUTAWAY.ROOT).toBe('/putaway');
    expect(putawayRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining(['/putaway', '/putaway/:id', '/putaway/:id/:action']),
    );
  });
});
