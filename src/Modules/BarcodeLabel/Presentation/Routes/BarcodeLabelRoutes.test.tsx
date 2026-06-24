import { describe, expect, it } from 'vitest';
import { ROUTES } from '@app/Config/Routes';
import { barcodeLabelRoutes } from '@modules/BarcodeLabel/Presentation/Routes/BarcodeLabelRoutes';

describe('barcodeLabelRoutes', () => {
  it('registers list, create, template detail/action, and print job detail/action routes', () => {
    expect(barcodeLabelRoutes.map((route) => route.path)).toEqual([
      ROUTES.LABELS.ROOT,
      ROUTES.LABELS.NEW,
      ROUTES.LABELS.TEMPLATE_DETAIL(),
      ROUTES.LABELS.TEMPLATE_ACTION(),
      ROUTES.LABELS.PRINT_JOB_DETAIL(),
      ROUTES.LABELS.PRINT_JOB_ACTION(),
    ]);
  });
});
