import { describe, expect, it } from 'vitest';

import {
  assignmentFormSchema,
  previewContextFormSchema,
  warehouseProfileFormSchema,
} from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';

const validProfile = {
  profileCode: 'WP-01',
  profileName: 'Default',
  warehouseTypeCode: 'DC',
  effectiveFrom: '2026-06-01',
  effectiveTo: '',
  warehouseId: '',
  zoneId: '',
  locationType: '',
  ownerId: '',
  skuId: '',
  itemClass: '',
  orderType: '',
  customerId: '',
  supplierId: '',
};

describe('warehouseProfileFormSchema', () => {
  it('accepts a minimal valid draft (code/name/warehouseTypeCode/effectiveFrom)', () => {
    expect(warehouseProfileFormSchema.safeParse(validProfile).success).toBe(true);
  });

  it('requires profileCode, profileName and warehouseTypeCode', () => {
    const result = warehouseProfileFormSchema.safeParse({
      ...validProfile,
      profileCode: '',
      profileName: '',
      warehouseTypeCode: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(expect.arrayContaining(['profileCode', 'profileName', 'warehouseTypeCode']));
    }
  });

  it('rejects an effectiveTo that is not after effectiveFrom', () => {
    const result = warehouseProfileFormSchema.safeParse({
      ...validProfile,
      effectiveFrom: '2026-06-10',
      effectiveTo: '2026-06-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'effectiveTo')).toBe(true);
    }
  });

  it('accepts an effectiveTo strictly after effectiveFrom', () => {
    const result = warehouseProfileFormSchema.safeParse({
      ...validProfile,
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('does NOT expose a status field (status is read-only; create is always DRAFT)', () => {
    const parsed = warehouseProfileFormSchema.parse(validProfile);
    expect('status' in parsed).toBe(false);
  });
});

describe('assignmentFormSchema', () => {
  it('requires warehouseId when assignmentType is WAREHOUSE', () => {
    expect(
      assignmentFormSchema.safeParse({ assignmentType: 'WAREHOUSE', warehouseId: '', warehouseTypeCode: '' }).success,
    ).toBe(false);
    expect(
      assignmentFormSchema.safeParse({ assignmentType: 'WAREHOUSE', warehouseId: 'wh-1', warehouseTypeCode: '' }).success,
    ).toBe(true);
  });

  it('requires warehouseTypeCode when assignmentType is WAREHOUSE_TYPE', () => {
    expect(
      assignmentFormSchema.safeParse({ assignmentType: 'WAREHOUSE_TYPE', warehouseTypeCode: '', warehouseId: '' }).success,
    ).toBe(false);
    expect(
      assignmentFormSchema.safeParse({ assignmentType: 'WAREHOUSE_TYPE', warehouseTypeCode: 'DC', warehouseId: '' }).success,
    ).toBe(true);
  });
});

describe('previewContextFormSchema', () => {
  it('requires warehouseTypeCode and accepts an otherwise empty context', () => {
    expect(previewContextFormSchema.safeParse({ warehouseTypeCode: '' }).success).toBe(false);
    expect(previewContextFormSchema.safeParse({ warehouseTypeCode: 'DC' }).success).toBe(true);
  });
});
