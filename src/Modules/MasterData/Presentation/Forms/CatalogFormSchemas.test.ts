import { describe, expect, it } from 'vitest';

import {
  itemCoverageFormSchema,
  ownerFormSchema,
  skuBarcodeFormSchema,
  skuFormSchema,
  uomConversionFormSchema,
  uomFormSchema,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';
import {
  mergeSelectedOption,
  type SelectOption,
} from '@modules/MasterData/Presentation/Forms/SelectOptions';

const validSku = {
  skuCode: 'SKU-01',
  skuName: 'Widget',
  itemClass: 'Standard',
  itemStatus: 'Active' as const,
  baseUomId: 'uom-1',
  inventoryUomId: 'uom-1',
  defaultOwnerId: '',
  lotControlled: false,
  expiryControlled: false,
  serialControlled: false,
  ownerControlled: false,
  lpnControlled: false,
  temperatureControlled: false,
  dgControlled: false,
  customsControlled: false,
  qcRequired: false,
  bondedFlag: false,
  temperatureClass: '',
  dgClass: '',
  shelfLifeDays: '',
  minRemainingShelfLifeDays: '',
};

describe('Catalog form schemas', () => {
  it('owner schema requires code and name', () => {
    expect(ownerFormSchema.safeParse({ ownerCode: '', ownerName: '', status: 'Active' }).success).toBe(
      false,
    );
    expect(
      ownerFormSchema.safeParse({ ownerCode: 'OWN-01', ownerName: 'Acme', status: 'Active' }).success,
    ).toBe(true);
  });

  it('uom schema rejects a decimal precision outside 0-6 and accepts a valid one', () => {
    expect(
      uomFormSchema.safeParse({ uomCode: 'EA', uomName: 'Each', status: 'Active', decimalPrecision: 7 })
        .success,
    ).toBe(false);
    expect(
      uomFormSchema.safeParse({ uomCode: 'EA', uomName: 'Each', status: 'Active', decimalPrecision: 3 })
        .success,
    ).toBe(true);
    expect(uomFormSchema.safeParse({ uomCode: '', uomName: '', status: 'Active' }).success).toBe(false);
  });

  it('sku schema accepts a valid SKU with no control flags', () => {
    expect(skuFormSchema.safeParse(validSku).success).toBe(true);
  });

  it('sku schema rejects each control-flag policy violation', () => {
    // OwnerControlled requires DefaultOwnerId.
    expect(skuFormSchema.safeParse({ ...validSku, ownerControlled: true }).success).toBe(false);
    expect(
      skuFormSchema.safeParse({ ...validSku, ownerControlled: true, defaultOwnerId: 'owner-1' })
        .success,
    ).toBe(true);

    // ExpiryControlled requires ShelfLifeDays > 0.
    expect(skuFormSchema.safeParse({ ...validSku, expiryControlled: true }).success).toBe(false);
    expect(
      skuFormSchema.safeParse({ ...validSku, expiryControlled: true, shelfLifeDays: 0 }).success,
    ).toBe(false);
    expect(
      skuFormSchema.safeParse({ ...validSku, expiryControlled: true, shelfLifeDays: 365 }).success,
    ).toBe(true);

    // TemperatureControlled requires TemperatureClass.
    expect(skuFormSchema.safeParse({ ...validSku, temperatureControlled: true }).success).toBe(false);
    expect(
      skuFormSchema.safeParse({
        ...validSku,
        temperatureControlled: true,
        temperatureClass: 'Chilled',
      }).success,
    ).toBe(true);

    // DgControlled requires DgClass.
    expect(skuFormSchema.safeParse({ ...validSku, dgControlled: true }).success).toBe(false);
    expect(
      skuFormSchema.safeParse({ ...validSku, dgControlled: true, dgClass: 'Class 3' }).success,
    ).toBe(true);

    // CustomsControlled requires BondedFlag = true.
    expect(skuFormSchema.safeParse({ ...validSku, customsControlled: true }).success).toBe(false);
    expect(
      skuFormSchema.safeParse({ ...validSku, customsControlled: true, bondedFlag: true }).success,
    ).toBe(true);
  });

  it('sku schema rejects missing required identifiers', () => {
    expect(skuFormSchema.safeParse({ ...validSku, skuCode: '' }).success).toBe(false);
    expect(skuFormSchema.safeParse({ ...validSku, baseUomId: '' }).success).toBe(false);
    expect(skuFormSchema.safeParse({ ...validSku, inventoryUomId: '' }).success).toBe(false);
    expect(skuFormSchema.safeParse({ ...validSku, itemClass: '' }).success).toBe(false);
  });

  it('sku barcode schema requires sku, uom and barcode value', () => {
    expect(
      skuBarcodeFormSchema.safeParse({
        skuId: 'sku-1',
        uomId: 'uom-1',
        barcodeValue: '0123456789012',
        barcodeType: 'EAN13',
        status: 'Active',
      }).success,
    ).toBe(true);
    expect(
      skuBarcodeFormSchema.safeParse({
        skuId: '',
        uomId: '',
        barcodeValue: '',
        barcodeType: '',
        status: 'Active',
      }).success,
    ).toBe(false);
  });

  it('uom conversion schema rejects equal from/to uom and a non-positive factor', () => {
    expect(
      uomConversionFormSchema.safeParse({
        skuId: 'sku-1',
        fromUomId: 'uom-1',
        toUomId: 'uom-1',
        factor: 12,
        effectiveFrom: '2026-06-18',
        status: 'Active',
      }).success,
    ).toBe(false);
    expect(
      uomConversionFormSchema.safeParse({
        skuId: 'sku-1',
        fromUomId: 'uom-1',
        toUomId: 'uom-2',
        factor: 0,
        effectiveFrom: '2026-06-18',
        status: 'Active',
      }).success,
    ).toBe(false);
    expect(
      uomConversionFormSchema.safeParse({
        skuId: 'sku-1',
        fromUomId: 'uom-1',
        toUomId: 'uom-2',
        factor: 12,
        effectiveFrom: '2026-06-18',
        status: 'Active',
      }).success,
    ).toBe(true);
  });

  it('mergeSelectedOption inserts an unavailable option when the current id is absent', () => {
    const options: SelectOption[] = [
      { value: 'uom-1', label: 'EA - Each' },
      { value: 'uom-2', label: 'CS - Case' },
    ];
    const merged = mergeSelectedOption(options, 'uom-9');
    expect(merged).toHaveLength(3);
    expect(merged[0]).toEqual({ value: 'uom-9', label: 'uom-9 (unavailable)' });
    expect(merged.slice(1)).toEqual(options);
  });

  it('mergeSelectedOption keeps options unchanged when the current id is already present', () => {
    const options: SelectOption[] = [{ value: 'uom-1', label: 'EA - Each' }];
    expect(mergeSelectedOption(options, 'uom-1')).toEqual(options);
  });

  it('mergeSelectedOption ignores a null or undefined current id', () => {
    const options: SelectOption[] = [{ value: 'uom-1', label: 'EA - Each' }];
    expect(mergeSelectedOption(options, null)).toEqual(options);
    expect(mergeSelectedOption(options, undefined)).toEqual(options);
    expect(mergeSelectedOption(options)).toEqual(options);
  });

  it('item coverage schema rejects MaxQty < MinQty and accepts a valid coverage', () => {
    expect(
      itemCoverageFormSchema.safeParse({
        skuId: 'sku-1',
        warehouseId: 'wh-1',
        status: 'Active',
        minQty: 10,
        maxQty: 5,
        multipleQty: 1,
      }).success,
    ).toBe(false);
    expect(
      itemCoverageFormSchema.safeParse({
        skuId: 'sku-1',
        warehouseId: 'wh-1',
        status: 'Active',
        minQty: 0,
        maxQty: 100,
        multipleQty: 1,
      }).success,
    ).toBe(true);
  });
});
