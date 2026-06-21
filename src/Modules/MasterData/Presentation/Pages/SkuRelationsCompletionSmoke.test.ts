import { describe, expect, it } from 'vitest';

import { CatalogMapper } from '@modules/MasterData/Infrastructure/Mappers/CatalogMapper';
import type {
  ItemCoverage,
  PackDefinition,
  SkuBarcode,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CreateItemCoverageInput,
  CreatePackDefinitionInput,
  CreateSkuBarcodeInput,
  CreateUomConversionInput,
  UpdateItemCoverageInput,
  UpdatePackDefinitionInput,
  UpdateSkuBarcodeInput,
  UpdateUomConversionInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import type { PaginatedResponse } from '@shared/Types/Api';

const now = '2026-06-21T00:00:00.000Z';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
}

class FakeSkuRelationsRepository {
  private packs: PackDefinition[] = [];
  private barcodes: SkuBarcode[] = [];
  private conversions: UomConversion[] = [];
  private coverages: ItemCoverage[] = [];

  listPackDefinitions(): Promise<PaginatedResponse<PackDefinition>> {
    return Promise.resolve(page(this.packs));
  }

  listSkuBarcodes(): Promise<PaginatedResponse<SkuBarcode>> {
    return Promise.resolve(page(this.barcodes));
  }

  listUomConversions(): Promise<PaginatedResponse<UomConversion>> {
    return Promise.resolve(page(this.conversions));
  }

  listItemCoverages(): Promise<PaginatedResponse<ItemCoverage>> {
    return Promise.resolve(page(this.coverages));
  }

  createPackDefinition(input: CreatePackDefinitionInput): Promise<PackDefinition> {
    const request = CatalogMapper.toCreatePackDefinitionRequest(input);
    const pack = CatalogMapper.toPackDefinition({
      Id: 'pack-1',
      SkuId: request.SkuId,
      PackCode: request.PackCode,
      PackName: request.PackName,
      UomId: request.UomId,
      QuantityPerPack: request.QuantityPerPack,
      IsDefault: request.IsDefault ?? false,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: null,
      UpdatedBy: null,
    });
    this.packs.push(pack);
    return Promise.resolve(pack);
  }

  updatePackDefinition(id: string, input: UpdatePackDefinitionInput): Promise<PackDefinition> {
    const request = CatalogMapper.toUpdatePackDefinitionRequest(input);
    const index = this.packs.findIndex((pack) => pack.id === id);
    const current = this.packs[index];
    const updated = CatalogMapper.toPackDefinition({
      Id: current.id,
      SkuId: request.SkuId ?? current.skuId,
      PackCode: request.PackCode ?? current.packCode,
      PackName: request.PackName ?? current.packName,
      UomId: request.UomId ?? current.uomId,
      QuantityPerPack: request.QuantityPerPack ?? current.quantityPerPack,
      IsDefault: request.IsDefault ?? current.isDefault,
      Status: request.Status ?? current.status,
      SourceSystem: request.SourceSystem ?? current.sourceSystem,
      ReferenceId: request.ReferenceId ?? current.referenceId,
      CreatedAt: current.createdAt,
      UpdatedAt: now,
      CreatedBy: current.createdBy,
      UpdatedBy: current.updatedBy,
    });
    this.packs[index] = updated;
    return Promise.resolve(updated);
  }

  createSkuBarcode(input: CreateSkuBarcodeInput): Promise<SkuBarcode> {
    const request = CatalogMapper.toCreateSkuBarcodeRequest(input);
    const barcode = CatalogMapper.toSkuBarcode({
      Id: 'bc-1',
      SkuId: request.SkuId,
      OwnerId: request.OwnerId ?? null,
      UomId: request.UomId,
      PackCode: request.PackCode ?? null,
      BarcodeValue: request.BarcodeValue,
      BarcodeType: request.BarcodeType,
      IsPrimary: request.IsPrimary ?? false,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: null,
      UpdatedBy: null,
    });
    this.barcodes.push(barcode);
    return Promise.resolve(barcode);
  }

  updateSkuBarcode(id: string, input: UpdateSkuBarcodeInput): Promise<SkuBarcode> {
    const request = CatalogMapper.toUpdateSkuBarcodeRequest(input);
    const index = this.barcodes.findIndex((barcode) => barcode.id === id);
    const current = this.barcodes[index];
    const updated = CatalogMapper.toSkuBarcode({
      Id: current.id,
      SkuId: request.SkuId ?? current.skuId,
      OwnerId: request.OwnerId ?? current.ownerId,
      UomId: request.UomId ?? current.uomId,
      PackCode: request.PackCode ?? current.packCode,
      BarcodeValue: request.BarcodeValue ?? current.barcodeValue,
      BarcodeType: request.BarcodeType ?? current.barcodeType,
      IsPrimary: request.IsPrimary ?? current.isPrimary,
      Status: request.Status ?? current.status,
      SourceSystem: request.SourceSystem ?? current.sourceSystem,
      ReferenceId: request.ReferenceId ?? current.referenceId,
      CreatedAt: current.createdAt,
      UpdatedAt: now,
      CreatedBy: current.createdBy,
      UpdatedBy: current.updatedBy,
    });
    this.barcodes[index] = updated;
    return Promise.resolve(updated);
  }

  createUomConversion(input: CreateUomConversionInput): Promise<UomConversion> {
    const request = CatalogMapper.toCreateUomConversionRequest(input);
    const conversion = CatalogMapper.toUomConversion({
      Id: 'conv-1',
      SkuId: request.SkuId,
      FromUomId: request.FromUomId,
      ToUomId: request.ToUomId,
      Factor: request.Factor,
      EffectiveFrom: request.EffectiveFrom,
      EffectiveTo: request.EffectiveTo ?? null,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: null,
      UpdatedBy: null,
    });
    this.conversions.push(conversion);
    return Promise.resolve(conversion);
  }

  updateUomConversion(id: string, input: UpdateUomConversionInput): Promise<UomConversion> {
    const request = CatalogMapper.toUpdateUomConversionRequest(input);
    const index = this.conversions.findIndex((conversion) => conversion.id === id);
    const current = this.conversions[index];
    const updated = CatalogMapper.toUomConversion({
      Id: current.id,
      SkuId: request.SkuId ?? current.skuId,
      FromUomId: request.FromUomId ?? current.fromUomId,
      ToUomId: request.ToUomId ?? current.toUomId,
      Factor: request.Factor ?? current.factor,
      EffectiveFrom: request.EffectiveFrom ?? current.effectiveFrom,
      EffectiveTo: request.EffectiveTo ?? current.effectiveTo,
      Status: request.Status ?? current.status,
      SourceSystem: request.SourceSystem ?? current.sourceSystem,
      ReferenceId: request.ReferenceId ?? current.referenceId,
      CreatedAt: current.createdAt,
      UpdatedAt: now,
      CreatedBy: current.createdBy,
      UpdatedBy: current.updatedBy,
    });
    this.conversions[index] = updated;
    return Promise.resolve(updated);
  }

  createItemCoverage(input: CreateItemCoverageInput): Promise<ItemCoverage> {
    const request = CatalogMapper.toCreateItemCoverageRequest(input);
    const coverage = CatalogMapper.toItemCoverage({
      Id: 'cov-1',
      SkuId: request.SkuId,
      WarehouseId: request.WarehouseId,
      OwnerId: request.OwnerId ?? null,
      MinQty: request.MinQty ?? 0,
      MaxQty: request.MaxQty ?? 0,
      StandardQty: request.StandardQty ?? 0,
      MultipleQty: request.MultipleQty ?? 1,
      LeadTimeDays: request.LeadTimeDays ?? 0,
      DefaultReceiveWarehouseId: request.DefaultReceiveWarehouseId ?? null,
      DefaultShipWarehouseId: request.DefaultShipWarehouseId ?? null,
      ReorderPolicy: request.ReorderPolicy ?? {},
      StopReceiving: request.StopReceiving ?? false,
      StopShipping: request.StopShipping ?? false,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: null,
      UpdatedBy: null,
    });
    this.coverages.push(coverage);
    return Promise.resolve(coverage);
  }

  updateItemCoverage(id: string, input: UpdateItemCoverageInput): Promise<ItemCoverage> {
    const request = CatalogMapper.toUpdateItemCoverageRequest(input);
    const index = this.coverages.findIndex((coverage) => coverage.id === id);
    const current = this.coverages[index];
    const updated = CatalogMapper.toItemCoverage({
      Id: current.id,
      SkuId: request.SkuId ?? current.skuId,
      WarehouseId: request.WarehouseId ?? current.warehouseId,
      OwnerId: request.OwnerId ?? current.ownerId,
      MinQty: request.MinQty ?? current.minQty,
      MaxQty: request.MaxQty ?? current.maxQty,
      StandardQty: request.StandardQty ?? current.standardQty,
      MultipleQty: request.MultipleQty ?? current.multipleQty,
      LeadTimeDays: request.LeadTimeDays ?? current.leadTimeDays,
      DefaultReceiveWarehouseId: request.DefaultReceiveWarehouseId ?? current.defaultReceiveWarehouseId,
      DefaultShipWarehouseId: request.DefaultShipWarehouseId ?? current.defaultShipWarehouseId,
      ReorderPolicy: request.ReorderPolicy ?? current.reorderPolicy,
      StopReceiving: request.StopReceiving ?? current.stopReceiving,
      StopShipping: request.StopShipping ?? current.stopShipping,
      Status: request.Status ?? current.status,
      SourceSystem: request.SourceSystem ?? current.sourceSystem,
      ReferenceId: request.ReferenceId ?? current.referenceId,
      CreatedAt: current.createdAt,
      UpdatedAt: now,
      CreatedBy: current.createdBy,
      UpdatedBy: current.updatedBy,
    });
    this.coverages[index] = updated;
    return Promise.resolve(updated);
  }
}

describe('SKU relations completion smoke', () => {
  it('round-trips create -> edit -> list for pack, barcode, conversion and coverage', async () => {
    const repository = new FakeSkuRelationsRepository();

    const pack = await repository.createPackDefinition({
      skuId: 'sku-1',
      packCode: 'CASE',
      packName: 'Case',
      uomId: 'uom-2',
      quantityPerPack: 12,
      status: 'Active',
      isDefault: true,
      reasonCode: 'CREATE_PACK',
    });
    const barcode = await repository.createSkuBarcode({
      skuId: 'sku-1',
      uomId: 'uom-1',
      barcodeValue: '0123456789012',
      barcodeType: 'EAN13',
      status: 'Active',
      packCode: 'CASE',
      isPrimary: true,
      reasonCode: 'CREATE_BARCODE',
    });
    const conversion = await repository.createUomConversion({
      skuId: 'sku-1',
      fromUomId: 'uom-1',
      toUomId: 'uom-2',
      factor: 12,
      effectiveFrom: '2026-06-21',
      status: 'Active',
      reasonCode: 'CREATE_CONVERSION',
    });
    const coverage = await repository.createItemCoverage({
      skuId: 'sku-1',
      warehouseId: 'wh-1',
      status: 'Active',
      minQty: 0,
      maxQty: 100,
      multipleQty: 1,
      stopShipping: false,
    });

    await repository.updatePackDefinition(pack.id, { packName: 'Case updated', quantityPerPack: 24 });
    await repository.updateSkuBarcode(barcode.id, { barcodeType: 'QR', isPrimary: false });
    await repository.updateUomConversion(conversion.id, { factor: 24 });
    await repository.updateItemCoverage(coverage.id, { maxQty: 250, stopShipping: true });

    await expect(repository.listPackDefinitions()).resolves.toMatchObject({
      items: [expect.objectContaining({ packName: 'Case updated', quantityPerPack: 24 })],
    });
    await expect(repository.listSkuBarcodes()).resolves.toMatchObject({
      items: [expect.objectContaining({ barcodeType: 'QR', isPrimary: false })],
    });
    await expect(repository.listUomConversions()).resolves.toMatchObject({
      items: [expect.objectContaining({ factor: 24 })],
    });
    await expect(repository.listItemCoverages()).resolves.toMatchObject({
      items: [expect.objectContaining({ maxQty: 250, stopShipping: true })],
    });
  });
});
