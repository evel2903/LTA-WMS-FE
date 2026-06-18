import { describe, expect, it } from 'vitest';

import { buildPreviewFormDefaults } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';

const profile: WarehouseProfile = {
  id: 'profile-1',
  profileCode: 'WP-01',
  profileName: 'Default',
  warehouseTypeCode: 'DC',
  version: 1,
  status: 'DRAFT',
  warehouseId: 'wh-1',
  zoneId: null,
  locationType: null,
  ownerId: 'owner-1',
  skuId: null,
  itemClass: 'STD',
  orderType: null,
  customerId: null,
  supplierId: null,
  scopeKey: 'DC|wh-1',
  effectiveFrom: '2026-06-01T00:00:00.000Z',
  effectiveTo: null,
  capabilityFlags: {},
  strategyPolicy: {},
  thresholdPolicy: {},
  approvalPolicy: {},
  labelDevicePolicy: {},
  integrationPolicy: {},
  auditPolicy: {},
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

describe('buildPreviewFormDefaults', () => {
  it('projects the profile scope into form-string defaults the PreviewContextForm consumes', () => {
    const defaults = buildPreviewFormDefaults(profile);

    expect(defaults.warehouseTypeCode).toBe('DC');
    expect(defaults.warehouseId).toBe('wh-1');
    expect(defaults.ownerId).toBe('owner-1');
    expect(defaults.itemClass).toBe('STD');
  });

  it('renders wildcard (null) axes as empty strings, never the literal "null"', () => {
    const defaults = buildPreviewFormDefaults(profile);

    // The form binds <input value> to these; a null would surface as "null" text.
    expect(defaults.zoneId).toBe('');
    expect(defaults.skuId).toBe('');
    expect(defaults.customerId).toBe('');
    expect(defaults.supplierId).toBe('');
    expect(Object.values(defaults)).not.toContain(null);
    expect(Object.values(defaults)).not.toContain('null');
  });
});
