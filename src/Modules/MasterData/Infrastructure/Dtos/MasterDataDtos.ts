import type {
  LocationStatus,
  MasterDataStatus,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';

export interface MasterDataAuditDto {
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface SiteDto extends MasterDataAuditDto {
  Id: string;
  SiteCode: string;
  SiteName: string;
  Status: MasterDataStatus;
}

export interface WarehouseDto extends MasterDataAuditDto {
  Id: string;
  SiteId: string;
  WarehouseCode: string;
  WarehouseName: string;
  WarehouseTypeCode: string;
  Status: MasterDataStatus;
  Timezone: string | null;
}

export interface WarehouseTypeDto extends MasterDataAuditDto {
  Id: string;
  WarehouseTypeCode: string;
  WarehouseTypeName: string;
  Description: string | null;
  Status: MasterDataStatus;
}

export interface ZoneDto extends MasterDataAuditDto {
  Id: string;
  WarehouseId: string;
  ZoneCode: string;
  ZoneName: string;
  ZoneType: string;
  Status: MasterDataStatus;
  Sequence: number | null;
  TemperatureClass: string | null;
  ComplianceFlags: Record<string, unknown>;
}

export interface LocationDto extends MasterDataAuditDto {
  Id: string;
  WarehouseId: string;
  ZoneId: string;
  ParentLocationId: string | null;
  LocationCode: string;
  LocationName: string;
  LocationType: string;
  LocationProfileId: string;
  LocationStatus: LocationStatus;
  CapacityQty: number | null;
  CapacityVolume: number | null;
  CapacityWeight: number | null;
  PalletSlot: number | null;
  TemperatureClass: string | null;
  DgCompatibilityGroup: string | null;
  BondedFlag: boolean;
  OwnerRestriction: string | null;
  MixSkuPolicy: string | null;
  MixLotPolicy: string | null;
  MixOwnerPolicy: string | null;
  PickSequence: number | null;
  PutawaySequence: number | null;
}

export interface LocationTreeDto extends LocationDto {
  Children: LocationTreeDto[];
}

export interface LocationProfileDto extends MasterDataAuditDto {
  Id: string;
  ProfileCode: string;
  ProfileName: string;
  LocationType: string;
  Version: number;
  Status: MasterDataStatus;
  CapacityPolicy: Record<string, unknown>;
  EligibilityPolicy: Record<string, unknown>;
  MixPolicy: Record<string, unknown>;
  CompliancePolicy: Record<string, unknown>;
  OperationPolicy: Record<string, unknown>;
}

export interface PagedMasterDataDto<TItem> {
  Items: TItem[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export type CreateSiteRequestDto = Pick<SiteDto, 'SiteCode' | 'SiteName' | 'Status'> &
  Partial<Pick<SiteDto, 'SourceSystem' | 'ReferenceId'>>;

export type UpdateSiteRequestDto = Partial<CreateSiteRequestDto>;

export type CreateWarehouseRequestDto = Pick<
  WarehouseDto,
  'SiteId' | 'WarehouseCode' | 'WarehouseName' | 'WarehouseTypeCode' | 'Status'
> &
  Partial<Pick<WarehouseDto, 'Timezone' | 'SourceSystem' | 'ReferenceId'>>;

export type UpdateWarehouseRequestDto = Partial<CreateWarehouseRequestDto>;

export type CreateWarehouseTypeRequestDto = Pick<
  WarehouseTypeDto,
  'WarehouseTypeCode' | 'WarehouseTypeName' | 'Status'
> &
  Partial<Pick<WarehouseTypeDto, 'Description' | 'SourceSystem' | 'ReferenceId'>> & {
    ReasonCode?: string | null;
  };

export type UpdateWarehouseTypeRequestDto = Partial<
  Omit<CreateWarehouseTypeRequestDto, 'WarehouseTypeCode'>
>;

export type CreateZoneRequestDto = Pick<
  ZoneDto,
  'WarehouseId' | 'ZoneCode' | 'ZoneName' | 'ZoneType' | 'Status'
> &
  Partial<
    Pick<
      ZoneDto,
      'Sequence' | 'TemperatureClass' | 'ComplianceFlags' | 'SourceSystem' | 'ReferenceId'
    >
  >;

export type UpdateZoneRequestDto = Partial<CreateZoneRequestDto>;

export type CreateLocationRequestDto = Pick<
  LocationDto,
  | 'WarehouseId'
  | 'ZoneId'
  | 'LocationCode'
  | 'LocationName'
  | 'LocationType'
  | 'LocationProfileId'
  | 'LocationStatus'
> &
  Partial<
    Pick<
      LocationDto,
      | 'ParentLocationId'
      | 'CapacityQty'
      | 'CapacityVolume'
      | 'CapacityWeight'
      | 'PalletSlot'
      | 'TemperatureClass'
      | 'DgCompatibilityGroup'
      | 'BondedFlag'
      | 'OwnerRestriction'
      | 'MixSkuPolicy'
      | 'MixLotPolicy'
      | 'MixOwnerPolicy'
      | 'PickSequence'
      | 'PutawaySequence'
      | 'SourceSystem'
      | 'ReferenceId'
    >
  >;

export type UpdateLocationRequestDto = Partial<CreateLocationRequestDto>;

export type CreateLocationProfileRequestDto = Pick<
  LocationProfileDto,
  'ProfileCode' | 'ProfileName' | 'LocationType' | 'Status'
> &
  Partial<
    Pick<
      LocationProfileDto,
      | 'CapacityPolicy'
      | 'EligibilityPolicy'
      | 'MixPolicy'
      | 'CompliancePolicy'
      | 'OperationPolicy'
      | 'SourceSystem'
      | 'ReferenceId'
    >
  > & {
    ReasonCode?: string | null;
  };

export type UpdateLocationProfileRequestDto = Partial<CreateLocationProfileRequestDto> & {
  Version?: number;
};
