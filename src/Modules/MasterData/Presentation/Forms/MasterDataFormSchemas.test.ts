import { describe, expect, it } from 'vitest';

import {
  buildLocationProfileOptions,
  locationFormSchema,
  siteFormSchema,
  warehouseFormSchema,
  zoneFormSchema,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';

describe('MasterData form schemas', () => {
  it('rejects empty business-required fields before submit', () => {
    expect(siteFormSchema.safeParse({ siteCode: '', siteName: '', status: 'Active' }).success).toBe(false);
    expect(
      warehouseFormSchema.safeParse({
        siteId: '',
        warehouseCode: '',
        warehouseName: '',
        warehouseTypeCode: '',
        status: 'Active',
      }).success,
    ).toBe(false);
    expect(
      zoneFormSchema.safeParse({
        warehouseId: '',
        zoneCode: '',
        zoneName: '',
        zoneType: '',
        status: 'Active',
      }).success,
    ).toBe(false);
    expect(
      locationFormSchema.safeParse({
        warehouseId: 'wh-1',
        zoneId: 'zone-1',
        parentLocationId: '',
        locationCode: '',
        locationName: '',
        locationType: '',
        locationProfileId: '',
        locationStatus: 'Active',
      }).success,
    ).toBe(false);
  });

  it('rejects whitespace-only required fields and trims surrounding spaces', () => {
    expect(siteFormSchema.safeParse({ siteCode: '   ', siteName: '   ', status: 'Active' }).success).toBe(
      false,
    );
    expect(
      zoneFormSchema.safeParse({
        warehouseId: 'wh-1',
        zoneCode: '   ',
        zoneName: 'Z',
        zoneType: 'Storage',
        status: 'Active',
      }).success,
    ).toBe(false);

    const trimmed = siteFormSchema.safeParse({
      siteCode: '  SITE-01  ',
      siteName: '  Main Site  ',
      status: 'Active',
    });
    expect(trimmed.success).toBe(true);
    expect(trimmed.success && trimmed.data.siteCode).toBe('SITE-01');
    expect(trimmed.success && trimmed.data.siteName).toBe('Main Site');
  });

  it('builds profile options and surfaces the current profile when it is missing from the active list', () => {
    const activeProfile: LocationProfile = {
      id: 'profile-1',
      profileCode: 'BIN-STD',
      profileName: 'Standard Bin',
      locationType: 'Bin',
      version: 1,
      status: 'Active',
      capacityPolicy: {},
      eligibilityPolicy: {},
      mixPolicy: {},
      compliancePolicy: {},
      operationPolicy: {},
      sourceSystem: null,
      referenceId: null,
      createdAt: '2026-06-18T00:00:00.000Z',
      updatedAt: '2026-06-18T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    };

    expect(buildLocationProfileOptions([activeProfile])).toEqual([
      { value: 'profile-1', label: 'BIN-STD - Standard Bin', unavailable: false },
    ]);

    const withMissingCurrent = buildLocationProfileOptions([activeProfile], 'profile-x');
    expect(withMissingCurrent).toHaveLength(2);
    expect(withMissingCurrent[0]).toMatchObject({ value: 'profile-x', unavailable: true });

    // Current profile already in the active list must not be duplicated.
    expect(buildLocationProfileOptions([activeProfile], 'profile-1')).toHaveLength(1);
  });

  it('accepts null parent location to clear root parent but not an empty string', () => {
    const valid = locationFormSchema.safeParse({
      warehouseId: 'wh-1',
      zoneId: 'zone-1',
      parentLocationId: null,
      locationCode: 'A-01-01',
      locationName: 'Aisle 01 Rack 01',
      locationType: 'Bin',
      locationProfileId: 'profile-1',
      locationStatus: 'Active',
    });
    const invalid = locationFormSchema.safeParse({
      warehouseId: 'wh-1',
      zoneId: 'zone-1',
      parentLocationId: '',
      locationCode: 'A-01-01',
      locationName: 'Aisle 01 Rack 01',
      locationType: 'Bin',
      locationProfileId: 'profile-1',
      locationStatus: 'Active',
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
