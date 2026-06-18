import { describe, expect, it } from 'vitest';

import type { ICatalogRepository } from '@modules/MasterData/Application/Interfaces/ICatalogRepository';
import { CatalogMapper } from '@modules/MasterData/Infrastructure/Mappers/CatalogMapper';
import type {
  ItemCoverage,
  Owner,
  Sku,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  OwnerListFilter,
  SkuListFilter,
  UomListFilter,
  UpdateSkuInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import type { PaginatedResponse } from '@shared/Types/Api';

const now = '2026-06-18T00:00:00.000Z';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
}

/**
 * A fake repository that round-trips a SKU through the *real* request builders
 * (toCreateSkuRequest / toUpdateSkuRequest) and the real toSku mapper so the
 * smoke test proves control flags survive the PascalCase boundary both ways.
 */
class FakeCatalogRepository implements ICatalogRepository {
  private skus: Sku[] = [];

  listOwners(): Promise<PaginatedResponse<Owner>> {
    return Promise.resolve(page<Owner>([]));
  }
  listUoms(): Promise<PaginatedResponse<Uom>> {
    return Promise.resolve(page<Uom>([]));
  }
  listSkus(_filter?: SkuListFilter): Promise<PaginatedResponse<Sku>> {
    return Promise.resolve(page(this.skus));
  }
  listSkuBarcodes(): Promise<PaginatedResponse<SkuBarcode>> {
    return Promise.resolve(page<SkuBarcode>([]));
  }
  listUomConversions(): Promise<PaginatedResponse<UomConversion>> {
    return Promise.resolve(page<UomConversion>([]));
  }
  listItemCoverages(): Promise<PaginatedResponse<ItemCoverage>> {
    return Promise.resolve(page<ItemCoverage>([]));
  }
  getSku(id: string): Promise<Sku> {
    const found = this.skus.find((sku) => sku.id === id);
    if (!found) return Promise.reject(new Error('not found'));
    return Promise.resolve(found);
  }

  createSku(input: CreateSkuInput): Promise<Sku> {
    // Round-trip through the real request builder then back through the mapper.
    const request = CatalogMapper.toCreateSkuRequest(input);
    const sku = CatalogMapper.toSku({
      Id: 'sku-1',
      DefaultOwnerId: null,
      TemperatureClass: null,
      DgClass: null,
      ShelfLifeDays: null,
      MinRemainingShelfLifeDays: null,
      BondedFlag: false,
      QcRequired: false,
      SerialControlled: false,
      LpnControlled: false,
      TemperatureControlled: false,
      DgControlled: false,
      CustomsControlled: false,
      LotControlled: false,
      ExpiryControlled: false,
      OwnerControlled: false,
      SourceSystem: null,
      ReferenceId: null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: null,
      UpdatedBy: null,
      // PascalCase request fields override the defaults above.
      ...request,
    });
    this.skus.push(sku);
    return Promise.resolve(sku);
  }

  updateSku(id: string, input: UpdateSkuInput): Promise<Sku> {
    const request = CatalogMapper.toUpdateSkuRequest(input);
    const index = this.skus.findIndex((sku) => sku.id === id);
    const current = this.skus[index];
    // Map current entity back to a DTO-ish shape and overlay the PascalCase patch.
    const merged = CatalogMapper.toSku({
      Id: current.id,
      SkuCode: current.skuCode,
      SkuName: current.skuName,
      DefaultOwnerId: current.defaultOwnerId,
      ItemClass: current.itemClass,
      ItemStatus: current.itemStatus,
      BaseUomId: current.baseUomId,
      InventoryUomId: current.inventoryUomId,
      LotControlled: current.lotControlled,
      ExpiryControlled: current.expiryControlled,
      SerialControlled: current.serialControlled,
      OwnerControlled: current.ownerControlled,
      LpnControlled: current.lpnControlled,
      TemperatureControlled: current.temperatureControlled,
      DgControlled: current.dgControlled,
      CustomsControlled: current.customsControlled,
      QcRequired: current.qcRequired,
      BondedFlag: current.bondedFlag,
      TemperatureClass: current.temperatureClass,
      DgClass: current.dgClass,
      ShelfLifeDays: current.shelfLifeDays,
      MinRemainingShelfLifeDays: current.minRemainingShelfLifeDays,
      SourceSystem: current.sourceSystem,
      ReferenceId: current.referenceId,
      CreatedAt: current.createdAt,
      UpdatedAt: now,
      CreatedBy: current.createdBy,
      UpdatedBy: current.updatedBy,
      ...request,
    });
    this.skus[index] = merged;
    return Promise.resolve(merged);
  }

  createOwner(_input: CreateOwnerInput): Promise<Owner> {
    return Promise.reject(new Error('not used'));
  }
  updateOwner(): Promise<Owner> {
    return Promise.reject(new Error('not used'));
  }
  createUom(_input: CreateUomInput): Promise<Uom> {
    return Promise.reject(new Error('not used'));
  }
  updateUom(): Promise<Uom> {
    return Promise.reject(new Error('not used'));
  }
  createSkuBarcode(_input: CreateSkuBarcodeInput): Promise<SkuBarcode> {
    return Promise.reject(new Error('not used'));
  }
  createUomConversion(_input: CreateUomConversionInput): Promise<UomConversion> {
    return Promise.reject(new Error('not used'));
  }
  createItemCoverage(_input: CreateItemCoverageInput): Promise<ItemCoverage> {
    return Promise.reject(new Error('not used'));
  }

  // Unused filter-typed helpers kept to satisfy lint on imported types.
  _filterTypes?: [OwnerListFilter, UomListFilter];
}

describe('SKU control flags smoke', () => {
  it('round-trips control flags through create -> getSku -> list', async () => {
    const repository = new FakeCatalogRepository();

    const created = await repository.createSku({
      skuCode: 'SKU-01',
      skuName: 'Widget',
      itemClass: 'Standard',
      itemStatus: 'Active',
      baseUomId: 'uom-1',
      inventoryUomId: 'uom-1',
      defaultOwnerId: 'owner-1',
      ownerControlled: true,
      lotControlled: true,
      expiryControlled: true,
      shelfLifeDays: 365,
    });

    expect(created.ownerControlled).toBe(true);
    expect(created.lotControlled).toBe(true);
    expect(created.expiryControlled).toBe(true);
    expect(created.shelfLifeDays).toBe(365);
    expect(created.defaultOwnerId).toBe('owner-1');

    const fetched = await repository.getSku(created.id);
    expect(fetched.ownerControlled).toBe(true);
    expect(fetched.expiryControlled).toBe(true);

    const listed = await repository.listSkus();
    expect(listed.items[0]?.lotControlled).toBe(true);

    const updated = await repository.updateSku(created.id, {
      expiryControlled: false,
      lotControlled: false,
    });
    expect(updated.expiryControlled).toBe(false);
    expect(updated.lotControlled).toBe(false);
    // Flags not in the patch must be preserved.
    expect(updated.ownerControlled).toBe(true);
  });
});
