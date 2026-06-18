import { describe, expect, it } from 'vitest';

import { buildPreviewContextFromProfile } from '@modules/WarehouseProfile/Application/UseCases/BuildPreviewContextUseCase';
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

describe('buildPreviewContextFromProfile', () => {
  it('copies the profile six-axis scope for a scope-based self-check', () => {
    const context = buildPreviewContextFromProfile(profile);

    expect(context.warehouseTypeCode).toBe('DC');
    expect(context.warehouseId).toBe('wh-1');
    expect(context.ownerId).toBe('owner-1');
    expect(context.itemClass).toBe('STD');
    // Contract divergence (Dev Note): the merged BE preview HTTP request rejects ProfileId
    // (forbidNonWhitelisted), so the self-check context must NOT carry a profileId. The BE
    // resolves the most-specific ACTIVE profile by scope instead of the by-id candidate.
    expect('profileId' in (context as object)).toBe(false);
  });

  it('does not invent axis values the profile leaves as wildcard (null stays null)', () => {
    const context = buildPreviewContextFromProfile(profile);
    expect(context.zoneId).toBeNull();
    expect(context.skuId).toBeNull();
    expect(context.customerId).toBeNull();
  });
});
