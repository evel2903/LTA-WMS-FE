import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  ItemCoverage,
  Owner,
  PackDefinition,
  Sku,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreatePackDefinitionInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  UpdateItemCoverageInput,
  UpdateOwnerInput,
  UpdatePackDefinitionInput,
  UpdateSkuBarcodeInput,
  UpdateSkuInput,
  UpdateUomConversionInput,
  UpdateUomInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import type {
  CreateItemCoverageRequestDto,
  CreateOwnerRequestDto,
  CreatePackDefinitionRequestDto,
  CreateSkuBarcodeRequestDto,
  CreateSkuRequestDto,
  CreateUomConversionRequestDto,
  CreateUomRequestDto,
  ItemCoverageDto,
  OwnerDto,
  PagedMasterDataDto,
  PackDefinitionDto,
  SkuBarcodeDto,
  SkuDto,
  UomConversionDto,
  UomDto,
  UpdateItemCoverageRequestDto,
  UpdateOwnerRequestDto,
  UpdatePackDefinitionRequestDto,
  UpdateSkuBarcodeRequestDto,
  UpdateSkuRequestDto,
  UpdateUomConversionRequestDto,
  UpdateUomRequestDto,
} from '@modules/MasterData/Infrastructure/Dtos/CatalogDtos';

/**
 * Strips nullish optional fields so create/PATCH payloads OMIT them. PATCH here
 * is partial-by-omission: an absent field means "no change". (The BE's
 * `@IsOptional()` would actually accept `null` too, but omitting is the FE
 * design choice — a consequence is that an already-set nullable field cannot be
 * cleared through this UI.) `false` and `0` are real values and are preserved.
 */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export const CatalogMapper = {
  toPaged<TDto, TEntity>(
    dto: PagedMasterDataDto<TDto>,
    mapper: (item: TDto) => TEntity,
  ): PaginatedResponse<TEntity> {
    // Null-guard against empty/`Data: null` envelopes so a missing list resolves
    // to an empty page instead of throwing.
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map(mapper),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toOwner(dto: OwnerDto): Owner {
    return {
      id: dto.Id,
      ownerCode: dto.OwnerCode,
      ownerName: dto.OwnerName,
      status: dto.Status,
      billingPolicy: dto.BillingPolicy,
      visibilityScope: dto.VisibilityScope,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toUom(dto: UomDto): Uom {
    return {
      id: dto.Id,
      uomCode: dto.UomCode,
      uomName: dto.UomName,
      uomType: dto.UomType,
      decimalPrecision: dto.DecimalPrecision,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toSku(dto: SkuDto): Sku {
    return {
      id: dto.Id,
      skuCode: dto.SkuCode,
      skuName: dto.SkuName,
      defaultOwnerId: dto.DefaultOwnerId,
      itemClass: dto.ItemClass,
      itemStatus: dto.ItemStatus,
      baseUomId: dto.BaseUomId,
      inventoryUomId: dto.InventoryUomId,
      lotControlled: dto.LotControlled,
      expiryControlled: dto.ExpiryControlled,
      serialControlled: dto.SerialControlled,
      ownerControlled: dto.OwnerControlled,
      lpnControlled: dto.LpnControlled,
      temperatureControlled: dto.TemperatureControlled,
      dgControlled: dto.DgControlled,
      customsControlled: dto.CustomsControlled,
      qcRequired: dto.QcRequired,
      bondedFlag: dto.BondedFlag,
      temperatureClass: dto.TemperatureClass,
      dgClass: dto.DgClass,
      shelfLifeDays: dto.ShelfLifeDays,
      minRemainingShelfLifeDays: dto.MinRemainingShelfLifeDays,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toSkuBarcode(dto: SkuBarcodeDto): SkuBarcode {
    return {
      id: dto.Id,
      skuId: dto.SkuId,
      ownerId: dto.OwnerId,
      uomId: dto.UomId,
      packCode: dto.PackCode,
      barcodeValue: dto.BarcodeValue,
      barcodeType: dto.BarcodeType,
      isPrimary: dto.IsPrimary,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toPackDefinition(dto: PackDefinitionDto): PackDefinition {
    return {
      id: dto.Id,
      skuId: dto.SkuId,
      packCode: dto.PackCode,
      packName: dto.PackName,
      uomId: dto.UomId,
      quantityPerPack: dto.QuantityPerPack,
      isDefault: dto.IsDefault,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toUomConversion(dto: UomConversionDto): UomConversion {
    return {
      id: dto.Id,
      skuId: dto.SkuId,
      fromUomId: dto.FromUomId,
      toUomId: dto.ToUomId,
      factor: dto.Factor,
      effectiveFrom: dto.EffectiveFrom,
      effectiveTo: dto.EffectiveTo,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toItemCoverage(dto: ItemCoverageDto): ItemCoverage {
    return {
      id: dto.Id,
      skuId: dto.SkuId,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      minQty: dto.MinQty,
      maxQty: dto.MaxQty,
      standardQty: dto.StandardQty,
      multipleQty: dto.MultipleQty,
      leadTimeDays: dto.LeadTimeDays,
      defaultReceiveWarehouseId: dto.DefaultReceiveWarehouseId,
      defaultShipWarehouseId: dto.DefaultShipWarehouseId,
      reorderPolicy: dto.ReorderPolicy,
      stopReceiving: dto.StopReceiving,
      stopShipping: dto.StopShipping,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  // ── Request builders (PascalCase, nullish optionals omitted per omit contract) ──

  toCreateOwnerRequest(input: CreateOwnerInput): CreateOwnerRequestDto {
    return removeEmpty({
      OwnerCode: input.ownerCode,
      OwnerName: input.ownerName,
      Status: input.status,
      BillingPolicy: input.billingPolicy,
      VisibilityScope: input.visibilityScope,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateOwnerRequest(input: UpdateOwnerInput): UpdateOwnerRequestDto {
    return removeEmpty({
      OwnerCode: input.ownerCode,
      OwnerName: input.ownerName,
      Status: input.status,
      BillingPolicy: input.billingPolicy,
      VisibilityScope: input.visibilityScope,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateUomRequest(input: CreateUomInput): CreateUomRequestDto {
    return removeEmpty({
      UomCode: input.uomCode,
      UomName: input.uomName,
      Status: input.status,
      UomType: input.uomType,
      DecimalPrecision: input.decimalPrecision,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateUomRequest(input: UpdateUomInput): UpdateUomRequestDto {
    return removeEmpty({
      UomCode: input.uomCode,
      UomName: input.uomName,
      Status: input.status,
      UomType: input.uomType,
      DecimalPrecision: input.decimalPrecision,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateSkuRequest(input: CreateSkuInput): CreateSkuRequestDto {
    return removeEmpty({
      SkuCode: input.skuCode,
      SkuName: input.skuName,
      ItemClass: input.itemClass,
      ItemStatus: input.itemStatus,
      BaseUomId: input.baseUomId,
      InventoryUomId: input.inventoryUomId,
      DefaultOwnerId: input.defaultOwnerId,
      LotControlled: input.lotControlled,
      ExpiryControlled: input.expiryControlled,
      SerialControlled: input.serialControlled,
      OwnerControlled: input.ownerControlled,
      LpnControlled: input.lpnControlled,
      TemperatureControlled: input.temperatureControlled,
      DgControlled: input.dgControlled,
      CustomsControlled: input.customsControlled,
      QcRequired: input.qcRequired,
      BondedFlag: input.bondedFlag,
      TemperatureClass: input.temperatureClass,
      DgClass: input.dgClass,
      ShelfLifeDays: input.shelfLifeDays,
      MinRemainingShelfLifeDays: input.minRemainingShelfLifeDays,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateSkuRequest(input: UpdateSkuInput): UpdateSkuRequestDto {
    return removeEmpty({
      SkuCode: input.skuCode,
      SkuName: input.skuName,
      ItemClass: input.itemClass,
      ItemStatus: input.itemStatus,
      BaseUomId: input.baseUomId,
      InventoryUomId: input.inventoryUomId,
      DefaultOwnerId: input.defaultOwnerId,
      LotControlled: input.lotControlled,
      ExpiryControlled: input.expiryControlled,
      SerialControlled: input.serialControlled,
      OwnerControlled: input.ownerControlled,
      LpnControlled: input.lpnControlled,
      TemperatureControlled: input.temperatureControlled,
      DgControlled: input.dgControlled,
      CustomsControlled: input.customsControlled,
      QcRequired: input.qcRequired,
      BondedFlag: input.bondedFlag,
      TemperatureClass: input.temperatureClass,
      DgClass: input.dgClass,
      ShelfLifeDays: input.shelfLifeDays,
      MinRemainingShelfLifeDays: input.minRemainingShelfLifeDays,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateSkuBarcodeRequest(input: CreateSkuBarcodeInput): CreateSkuBarcodeRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      UomId: input.uomId,
      BarcodeValue: input.barcodeValue,
      BarcodeType: input.barcodeType,
      Status: input.status,
      OwnerId: input.ownerId,
      PackCode: input.packCode,
      IsPrimary: input.isPrimary,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toUpdateSkuBarcodeRequest(input: UpdateSkuBarcodeInput): UpdateSkuBarcodeRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      UomId: input.uomId,
      BarcodeValue: input.barcodeValue,
      BarcodeType: input.barcodeType,
      Status: input.status,
      OwnerId: input.ownerId,
      PackCode: input.packCode,
      IsPrimary: input.isPrimary,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toCreatePackDefinitionRequest(input: CreatePackDefinitionInput): CreatePackDefinitionRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      PackCode: input.packCode,
      PackName: input.packName,
      UomId: input.uomId,
      QuantityPerPack: input.quantityPerPack,
      Status: input.status,
      IsDefault: input.isDefault,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toUpdatePackDefinitionRequest(input: UpdatePackDefinitionInput): UpdatePackDefinitionRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      PackCode: input.packCode,
      PackName: input.packName,
      UomId: input.uomId,
      QuantityPerPack: input.quantityPerPack,
      Status: input.status,
      IsDefault: input.isDefault,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toCreateUomConversionRequest(input: CreateUomConversionInput): CreateUomConversionRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      FromUomId: input.fromUomId,
      ToUomId: input.toUomId,
      Factor: input.factor,
      EffectiveFrom: input.effectiveFrom,
      Status: input.status,
      EffectiveTo: input.effectiveTo,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toUpdateUomConversionRequest(input: UpdateUomConversionInput): UpdateUomConversionRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      FromUomId: input.fromUomId,
      ToUomId: input.toUomId,
      Factor: input.factor,
      EffectiveFrom: input.effectiveFrom,
      Status: input.status,
      EffectiveTo: input.effectiveTo,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toCreateItemCoverageRequest(input: CreateItemCoverageInput): CreateItemCoverageRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      WarehouseId: input.warehouseId,
      Status: input.status,
      OwnerId: input.ownerId,
      MinQty: input.minQty,
      MaxQty: input.maxQty,
      StandardQty: input.standardQty,
      MultipleQty: input.multipleQty,
      LeadTimeDays: input.leadTimeDays,
      DefaultReceiveWarehouseId: input.defaultReceiveWarehouseId,
      DefaultShipWarehouseId: input.defaultShipWarehouseId,
      ReorderPolicy: input.reorderPolicy,
      StopReceiving: input.stopReceiving,
      StopShipping: input.stopShipping,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateItemCoverageRequest(input: UpdateItemCoverageInput): UpdateItemCoverageRequestDto {
    return removeEmpty({
      SkuId: input.skuId,
      WarehouseId: input.warehouseId,
      Status: input.status,
      OwnerId: input.ownerId,
      MinQty: input.minQty,
      MaxQty: input.maxQty,
      StandardQty: input.standardQty,
      MultipleQty: input.multipleQty,
      LeadTimeDays: input.leadTimeDays,
      DefaultReceiveWarehouseId: input.defaultReceiveWarehouseId,
      DefaultShipWarehouseId: input.defaultShipWarehouseId,
      ReorderPolicy: input.reorderPolicy,
      StopReceiving: input.stopReceiving,
      StopShipping: input.stopShipping,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },
};
