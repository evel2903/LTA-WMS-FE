import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { MasterDataAuditDto } from '@modules/MasterData/Infrastructure/Dtos/MasterDataDtos';

export type { PagedMasterDataDto } from '@modules/MasterData/Infrastructure/Dtos/MasterDataDtos';

// ── Response DTOs (PascalCase, wire format) ───────────────────────────────────

export interface OwnerDto extends MasterDataAuditDto {
  Id: string;
  OwnerCode: string;
  OwnerName: string;
  Status: MasterDataStatus;
  BillingPolicy: Record<string, unknown>;
  VisibilityScope: Record<string, unknown>;
}

export interface UomDto extends MasterDataAuditDto {
  Id: string;
  UomCode: string;
  UomName: string;
  UomType: string | null;
  DecimalPrecision: number;
  Status: MasterDataStatus;
}

export interface SkuDto extends MasterDataAuditDto {
  Id: string;
  SkuCode: string;
  SkuName: string;
  DefaultOwnerId: string | null;
  ItemClass: string;
  ItemStatus: SkuStatus;
  BaseUomId: string;
  InventoryUomId: string;
  LotControlled: boolean;
  ExpiryControlled: boolean;
  SerialControlled: boolean;
  OwnerControlled: boolean;
  LpnControlled: boolean;
  TemperatureControlled: boolean;
  DgControlled: boolean;
  CustomsControlled: boolean;
  QcRequired: boolean;
  BondedFlag: boolean;
  TemperatureClass: string | null;
  DgClass: string | null;
  ShelfLifeDays: number | null;
  MinRemainingShelfLifeDays: number | null;
}

export interface SkuBarcodeDto extends MasterDataAuditDto {
  Id: string;
  SkuId: string;
  OwnerId: string | null;
  UomId: string;
  PackCode: string | null;
  BarcodeValue: string;
  BarcodeType: string;
  IsPrimary: boolean;
  EffectiveFrom: string | null;
  EffectiveTo: string | null;
  Status: MasterDataStatus;
}

export interface PackDefinitionDto extends MasterDataAuditDto {
  Id: string;
  SkuId: string;
  PackCode: string;
  PackName: string;
  UomId: string;
  QuantityPerPack: number;
  IsDefault: boolean;
  Status: MasterDataStatus;
}

export interface UomConversionDto extends MasterDataAuditDto {
  Id: string;
  SkuId: string;
  FromUomId: string;
  ToUomId: string;
  Factor: number;
  EffectiveFrom: string;
  EffectiveTo: string | null;
  Status: MasterDataStatus;
}

export interface ItemCoverageDto extends MasterDataAuditDto {
  Id: string;
  SkuId: string;
  WarehouseId: string;
  OwnerId: string | null;
  MinQty: number;
  MaxQty: number;
  StandardQty: number;
  MultipleQty: number;
  LeadTimeDays: number;
  DefaultReceiveWarehouseId: string | null;
  DefaultShipWarehouseId: string | null;
  ReorderPolicy: Record<string, unknown>;
  StopReceiving: boolean;
  StopShipping: boolean;
  Status: MasterDataStatus;
}

// ── Request DTOs (PascalCase) ─────────────────────────────────────────────────

export type CreateOwnerRequestDto = Pick<OwnerDto, 'OwnerCode' | 'OwnerName' | 'Status'> &
  Partial<
    Pick<OwnerDto, 'BillingPolicy' | 'VisibilityScope' | 'SourceSystem' | 'ReferenceId'>
  >;

export type UpdateOwnerRequestDto = Partial<CreateOwnerRequestDto>;

export type CreateUomRequestDto = Pick<UomDto, 'UomCode' | 'UomName' | 'Status'> &
  Partial<Pick<UomDto, 'UomType' | 'DecimalPrecision' | 'SourceSystem' | 'ReferenceId'>>;

export type UpdateUomRequestDto = Partial<CreateUomRequestDto>;

export type CreateSkuRequestDto = Pick<
  SkuDto,
  'SkuCode' | 'SkuName' | 'ItemClass' | 'ItemStatus' | 'BaseUomId' | 'InventoryUomId'
> &
  Partial<
    Pick<
      SkuDto,
      | 'DefaultOwnerId'
      | 'LotControlled'
      | 'ExpiryControlled'
      | 'SerialControlled'
      | 'OwnerControlled'
      | 'LpnControlled'
      | 'TemperatureControlled'
      | 'DgControlled'
      | 'CustomsControlled'
      | 'QcRequired'
      | 'BondedFlag'
      | 'TemperatureClass'
      | 'DgClass'
      | 'ShelfLifeDays'
      | 'MinRemainingShelfLifeDays'
      | 'SourceSystem'
      | 'ReferenceId'
    >
  >;

export type UpdateSkuRequestDto = Partial<CreateSkuRequestDto>;

export type CreateSkuBarcodeRequestDto = Pick<
  SkuBarcodeDto,
  'SkuId' | 'UomId' | 'BarcodeValue' | 'BarcodeType' | 'Status'
> &
  Partial<
    Pick<
      SkuBarcodeDto,
      | 'OwnerId'
      | 'PackCode'
      | 'IsPrimary'
      | 'EffectiveFrom'
      | 'EffectiveTo'
      | 'SourceSystem'
      | 'ReferenceId'
    >
  > & {
    ReasonCode?: string | null;
  };

export type UpdateSkuBarcodeRequestDto = Partial<CreateSkuBarcodeRequestDto>;

export type CreatePackDefinitionRequestDto = Pick<
  PackDefinitionDto,
  'SkuId' | 'PackCode' | 'PackName' | 'UomId' | 'QuantityPerPack' | 'Status'
> &
  Partial<Pick<PackDefinitionDto, 'IsDefault' | 'SourceSystem' | 'ReferenceId'>> & {
    ReasonCode?: string | null;
  };

export type UpdatePackDefinitionRequestDto = Partial<CreatePackDefinitionRequestDto>;

export type CreateUomConversionRequestDto = Pick<
  UomConversionDto,
  'SkuId' | 'FromUomId' | 'ToUomId' | 'Factor' | 'EffectiveFrom' | 'Status'
> &
  Partial<Pick<UomConversionDto, 'EffectiveTo' | 'SourceSystem' | 'ReferenceId'>> & {
    ReasonCode?: string | null;
  };

export type UpdateUomConversionRequestDto = Partial<CreateUomConversionRequestDto>;

export type CreateItemCoverageRequestDto = Pick<
  ItemCoverageDto,
  'SkuId' | 'WarehouseId' | 'Status'
> &
  Partial<
    Pick<
      ItemCoverageDto,
      | 'OwnerId'
      | 'MinQty'
      | 'MaxQty'
      | 'StandardQty'
      | 'MultipleQty'
      | 'LeadTimeDays'
      | 'DefaultReceiveWarehouseId'
      | 'DefaultShipWarehouseId'
      | 'ReorderPolicy'
      | 'StopReceiving'
      | 'StopShipping'
      | 'SourceSystem'
      | 'ReferenceId'
    >
  >;

export type UpdateItemCoverageRequestDto = Partial<CreateItemCoverageRequestDto>;
