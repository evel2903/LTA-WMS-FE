import { describe, expect, it } from 'vitest';

import type {
  ItemCoverageDto,
  OwnerDto,
  PagedMasterDataDto,
  PackDefinitionDto,
  SkuBarcodeDto,
  SkuDto,
  UomConversionDto,
  UomDto,
} from '@modules/MasterData/Infrastructure/Dtos/CatalogDtos';
import { CatalogMapper } from '@modules/MasterData/Infrastructure/Mappers/CatalogMapper';

const ownerDto: OwnerDto = {
  Id: 'owner-1',
  OwnerCode: 'OWN-01',
  OwnerName: 'Acme Logistics',
  Status: 'Active',
  BillingPolicy: { model: 'monthly' },
  VisibilityScope: { warehouses: ['wh-1'] },
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const uomDto: UomDto = {
  Id: 'uom-1',
  UomCode: 'EA',
  UomName: 'Each',
  UomType: 'Count',
  DecimalPrecision: 0,
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const skuDto: SkuDto = {
  Id: 'sku-1',
  SkuCode: 'SKU-01',
  SkuName: 'Widget',
  DefaultOwnerId: 'owner-1',
  ItemClass: 'Standard',
  ItemStatus: 'Active',
  BaseUomId: 'uom-1',
  InventoryUomId: 'uom-1',
  LotControlled: true,
  ExpiryControlled: true,
  SerialControlled: false,
  OwnerControlled: true,
  LpnControlled: false,
  TemperatureControlled: false,
  DgControlled: false,
  CustomsControlled: false,
  QcRequired: false,
  BondedFlag: false,
  TemperatureClass: null,
  DgClass: null,
  ShelfLifeDays: 365,
  MinRemainingShelfLifeDays: 30,
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const skuBarcodeDto: SkuBarcodeDto = {
  Id: 'bc-1',
  SkuId: 'sku-1',
  OwnerId: 'owner-1',
  UomId: 'uom-1',
  PackCode: null,
  BarcodeValue: '0123456789012',
  BarcodeType: 'EAN13',
  IsPrimary: true,
  EffectiveFrom: '2026-06-18T00:00:00.000Z',
  EffectiveTo: null,
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const packDefinitionDto: PackDefinitionDto = {
  Id: 'pack-1',
  SkuId: 'sku-1',
  PackCode: 'CASE',
  PackName: 'Case',
  UomId: 'uom-2',
  QuantityPerPack: 12,
  IsDefault: true,
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const uomConversionDto: UomConversionDto = {
  Id: 'conv-1',
  SkuId: 'sku-1',
  FromUomId: 'uom-1',
  ToUomId: 'uom-2',
  Factor: 12,
  EffectiveFrom: '2026-06-18T00:00:00.000Z',
  EffectiveTo: null,
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const itemCoverageDto: ItemCoverageDto = {
  Id: 'cov-1',
  SkuId: 'sku-1',
  WarehouseId: 'wh-1',
  OwnerId: 'owner-1',
  MinQty: 0,
  MaxQty: 100,
  StandardQty: 50,
  MultipleQty: 1,
  LeadTimeDays: 7,
  DefaultReceiveWarehouseId: 'wh-1',
  DefaultShipWarehouseId: 'wh-1',
  ReorderPolicy: { policy: 'min-max' },
  StopReceiving: false,
  StopShipping: false,
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

describe('CatalogMapper', () => {
  it('maps PascalCase Owner/Uom/Sku DTOs to camelCase domain entities', () => {
    expect(CatalogMapper.toOwner(ownerDto)).toMatchObject({
      id: 'owner-1',
      ownerCode: 'OWN-01',
      ownerName: 'Acme Logistics',
      status: 'Active',
      billingPolicy: { model: 'monthly' },
      visibilityScope: { warehouses: ['wh-1'] },
    });

    expect(CatalogMapper.toUom(uomDto)).toMatchObject({
      id: 'uom-1',
      uomCode: 'EA',
      uomName: 'Each',
      uomType: 'Count',
      decimalPrecision: 0,
      status: 'Active',
    });

    expect(CatalogMapper.toSku(skuDto)).toMatchObject({
      id: 'sku-1',
      skuCode: 'SKU-01',
      skuName: 'Widget',
      defaultOwnerId: 'owner-1',
      itemClass: 'Standard',
      itemStatus: 'Active',
      baseUomId: 'uom-1',
      inventoryUomId: 'uom-1',
      lotControlled: true,
      expiryControlled: true,
      ownerControlled: true,
      shelfLifeDays: 365,
    });
  });

  it('maps SKU relation DTOs (pack, barcode, conversion, coverage) to camelCase', () => {
    expect(CatalogMapper.toPackDefinition(packDefinitionDto)).toMatchObject({
      id: 'pack-1',
      skuId: 'sku-1',
      packCode: 'CASE',
      packName: 'Case',
      uomId: 'uom-2',
      quantityPerPack: 12,
      isDefault: true,
      status: 'Active',
    });

    expect(CatalogMapper.toSkuBarcode(skuBarcodeDto)).toMatchObject({
      id: 'bc-1',
      skuId: 'sku-1',
      ownerId: 'owner-1',
      uomId: 'uom-1',
      barcodeValue: '0123456789012',
      barcodeType: 'EAN13',
      isPrimary: true,
      effectiveFrom: '2026-06-18T00:00:00.000Z',
      effectiveTo: null,
      status: 'Active',
    });

    expect(CatalogMapper.toUomConversion(uomConversionDto)).toMatchObject({
      id: 'conv-1',
      skuId: 'sku-1',
      fromUomId: 'uom-1',
      toUomId: 'uom-2',
      factor: 12,
      effectiveFrom: '2026-06-18T00:00:00.000Z',
      effectiveTo: null,
      status: 'Active',
    });

    expect(CatalogMapper.toItemCoverage(itemCoverageDto)).toMatchObject({
      id: 'cov-1',
      skuId: 'sku-1',
      warehouseId: 'wh-1',
      ownerId: 'owner-1',
      minQty: 0,
      maxQty: 100,
      multipleQty: 1,
      reorderPolicy: { policy: 'min-max' },
      stopReceiving: false,
      status: 'Active',
    });
  });

  it('maps paged list envelopes from Items/Meta to frontend pagination shape', () => {
    const paged: PagedMasterDataDto<OwnerDto> = {
      Items: [ownerDto],
      Meta: { Page: 2, PageSize: 10, TotalItems: 11, TotalPages: 2 },
    };

    expect(CatalogMapper.toPaged(paged, (item) => CatalogMapper.toOwner(item))).toEqual({
      items: [expect.objectContaining({ id: 'owner-1' })],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
  });

  it('returns an empty page instead of throwing when the envelope is null/empty', () => {
    const empty = CatalogMapper.toPaged(
      undefined as unknown as PagedMasterDataDto<OwnerDto>,
      (item) => CatalogMapper.toOwner(item),
    );
    expect(empty).toEqual({ items: [], page: 1, pageSize: 0, totalItems: 0, totalPages: 0 });

    const partial = CatalogMapper.toPaged(
      { Items: undefined, Meta: undefined } as unknown as PagedMasterDataDto<OwnerDto>,
      (item) => CatalogMapper.toOwner(item),
    );
    expect(partial.items).toEqual([]);
    expect(partial.totalItems).toBe(0);
  });

  it('builds a PascalCase create SKU request and omits undefined optional fields', () => {
    const request = CatalogMapper.toCreateSkuRequest({
      skuCode: 'SKU-99',
      skuName: 'New Widget',
      itemClass: 'Standard',
      itemStatus: 'Draft',
      baseUomId: 'uom-1',
      inventoryUomId: 'uom-1',
      lotControlled: true,
      ownerControlled: false,
    });

    expect(request).toMatchObject({
      SkuCode: 'SKU-99',
      SkuName: 'New Widget',
      ItemClass: 'Standard',
      ItemStatus: 'Draft',
      BaseUomId: 'uom-1',
      InventoryUomId: 'uom-1',
      LotControlled: true,
      OwnerControlled: false,
    });
    // Optional fields that were not supplied must be omitted (BE forbids unknown / undefined).
    expect('DefaultOwnerId' in request).toBe(false);
    expect('TemperatureClass' in request).toBe(false);
    expect('ShelfLifeDays' in request).toBe(false);
  });

  it('omits null optional fields on PATCH (omit contract) but keeps false / 0', () => {
    const sku = CatalogMapper.toUpdateSkuRequest({
      skuCode: 'SKU-01',
      defaultOwnerId: null,
      temperatureClass: null,
      shelfLifeDays: null,
      lotControlled: false,
      bondedFlag: false,
    });
    // null nullable fields are OMITTED, not sent as null...
    expect('DefaultOwnerId' in sku).toBe(false);
    expect('TemperatureClass' in sku).toBe(false);
    expect('ShelfLifeDays' in sku).toBe(false);
    // ...but false (and 0) are real values and must survive.
    expect(sku).toEqual({ SkuCode: 'SKU-01', LotControlled: false, BondedFlag: false });

    const owner = CatalogMapper.toUpdateOwnerRequest({ ownerName: 'Beta', sourceSystem: null });
    expect(owner).toEqual({ OwnerName: 'Beta' });

    const cov = CatalogMapper.toUpdateItemCoverageRequest({ minQty: 0, ownerId: null });
    expect(cov).toEqual({ MinQty: 0 });
  });

  it('builds pack and relation PATCH payloads with optional reason hooks', () => {
    expect(
      CatalogMapper.toCreatePackDefinitionRequest({
        skuId: 'sku-1',
        packCode: 'CASE',
        packName: 'Case',
        uomId: 'uom-2',
        quantityPerPack: 12,
        status: 'Active',
        isDefault: false,
        reasonCode: 'MASTER_DATA_FIX',
      }),
    ).toEqual({
      SkuId: 'sku-1',
      PackCode: 'CASE',
      PackName: 'Case',
      UomId: 'uom-2',
      QuantityPerPack: 12,
      Status: 'Active',
      IsDefault: false,
      ReasonCode: 'MASTER_DATA_FIX',
    });

    expect(
      CatalogMapper.toUpdatePackDefinitionRequest({
        packName: 'Case updated',
        quantityPerPack: 24,
        reasonCode: 'MASTER_DATA_FIX',
      }),
    ).toEqual({
      PackName: 'Case updated',
      QuantityPerPack: 24,
      ReasonCode: 'MASTER_DATA_FIX',
    });

    expect(
      CatalogMapper.toUpdateSkuBarcodeRequest({
        barcodeType: 'QR',
        isPrimary: false,
        ownerId: null,
        packCode: null,
        effectiveFrom: '2026-06-21',
        effectiveTo: null,
        reasonCode: 'RELATION_EDIT',
      }),
    ).toEqual({
      BarcodeType: 'QR',
      IsPrimary: false,
      EffectiveFrom: '2026-06-21',
      EffectiveTo: null,
      ReasonCode: 'RELATION_EDIT',
    });

    expect(
      CatalogMapper.toUpdateUomConversionRequest({
        factor: 24,
        effectiveTo: null,
        reasonCode: 'RELATION_EDIT',
      }),
    ).toEqual({ Factor: 24, ReasonCode: 'RELATION_EDIT' });
  });

  it('keeps create Owner/Uom requests in PascalCase', () => {
    expect(
      CatalogMapper.toCreateOwnerRequest({
        ownerCode: 'OWN-99',
        ownerName: 'Beta Corp',
        status: 'Active',
      }),
    ).toEqual({ OwnerCode: 'OWN-99', OwnerName: 'Beta Corp', Status: 'Active' });

    expect(
      CatalogMapper.toCreateUomRequest({
        uomCode: 'BOX',
        uomName: 'Box',
        status: 'Active',
        decimalPrecision: 2,
      }),
    ).toEqual({ UomCode: 'BOX', UomName: 'Box', Status: 'Active', DecimalPrecision: 2 });
  });
});
