import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { inboundPlanRoutes } from '@modules/InboundPlan/Presentation/Routes/InboundPlanRoutes';

describe('InboundPlan routes', () => {
  it('registers root, create, detail, edit and gate-in routes', () => {
    expect(ROUTES.INBOUND_PLAN.ROOT).toBe('/inbound');
    expect(ROUTES.INBOUND_PLAN.EDIT('plan-1')).toBe('/inbound/plan-1/edit');
    expect(ROUTES.INBOUND_PLAN.GATE_IN('plan-1')).toBe('/inbound/plan-1/gate-in');
    expect(inboundPlanRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '/inbound',
        '/inbound/new',
        '/inbound/:id',
        '/inbound/:id/edit',
        '/inbound/:id/gate-in',
      ]),
    );
  });
});
