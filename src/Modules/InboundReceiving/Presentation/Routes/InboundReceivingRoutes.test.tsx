import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { inboundReceivingRoutes } from '@modules/InboundReceiving/Presentation/Routes/InboundReceivingRoutes';

describe('InboundReceiving routes', () => {
  it('registers receipt list/create/detail and compatibility plan routes', () => {
    expect(ROUTES.INBOUND_RECEIVING.DISCREPANCY('plan-1', 'line-1')).toBe(
      '/inbound-receiving/plan-1/discrepancy/line-1',
    );
    expect(inboundReceivingRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '/inbound-receiving',
        '/inbound-receiving/new',
        '/inbound-receiving/receipts/:receiptId',
        '/inbound-receiving/receipts/:receiptId/:action',
        '/inbound-receiving/:id',
        '/inbound-receiving/:id/discrepancy/:lineId',
        '/inbound-receiving/:id/:action',
      ]),
    );
  });
});
