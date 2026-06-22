import { describe, expect, it } from 'vitest';
import { ROUTES } from '@app/Config/Routes';
import { barcodeLabelRoutes } from '@modules/BarcodeLabel/Presentation/Routes/BarcodeLabelRoutes';

describe('barcodeLabelRoutes', () => {
  it('registers the V1 labels route at /labels', () => {
    expect(ROUTES.LABELS.ROOT).toBe('/labels');
    expect(barcodeLabelRoutes[0]?.path).toBe('/labels');
  });
});
