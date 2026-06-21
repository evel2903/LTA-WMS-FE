import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  Location,
  LocationProfile,
  LocationTree,
  Site,
  Warehouse,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateLocationInput,
  CreateLocationProfileInput,
  CreateSiteInput,
  CreateWarehouseInput,
  CreateZoneInput,
  UpdateLocationInput,
  UpdateLocationProfileInput,
  UpdateSiteInput,
  UpdateWarehouseInput,
  UpdateZoneInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import type {
  CreateLocationRequestDto,
  CreateLocationProfileRequestDto,
  CreateSiteRequestDto,
  CreateWarehouseRequestDto,
  CreateZoneRequestDto,
  LocationDto,
  LocationProfileDto,
  LocationTreeDto,
  PagedMasterDataDto,
  SiteDto,
  UpdateLocationRequestDto,
  UpdateLocationProfileRequestDto,
  UpdateSiteRequestDto,
  UpdateWarehouseRequestDto,
  UpdateZoneRequestDto,
  WarehouseDto,
  ZoneDto,
} from '@modules/MasterData/Infrastructure/Dtos/MasterDataDtos';

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export const MasterDataMapper = {
  toPaged<TDto, TEntity>(
    dto: PagedMasterDataDto<TDto>,
    mapper: (item: TDto) => TEntity,
  ): PaginatedResponse<TEntity> {
    // Defend against null/empty envelopes (e.g. 204 or `Data: null`) so a
    // missing list resolves to an empty page instead of throwing.
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

  toSite(dto: SiteDto): Site {
    return {
      id: dto.Id,
      siteCode: dto.SiteCode,
      siteName: dto.SiteName,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toWarehouse(dto: WarehouseDto): Warehouse {
    return {
      id: dto.Id,
      siteId: dto.SiteId,
      warehouseCode: dto.WarehouseCode,
      warehouseName: dto.WarehouseName,
      warehouseTypeCode: dto.WarehouseTypeCode,
      status: dto.Status,
      timezone: dto.Timezone,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toZone(dto: ZoneDto): Zone {
    return {
      id: dto.Id,
      warehouseId: dto.WarehouseId,
      zoneCode: dto.ZoneCode,
      zoneName: dto.ZoneName,
      zoneType: dto.ZoneType,
      status: dto.Status,
      sequence: dto.Sequence,
      temperatureClass: dto.TemperatureClass,
      complianceFlags: dto.ComplianceFlags,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toLocation(dto: LocationDto): Location {
    return {
      id: dto.Id,
      warehouseId: dto.WarehouseId,
      zoneId: dto.ZoneId,
      parentLocationId: dto.ParentLocationId,
      locationCode: dto.LocationCode,
      locationName: dto.LocationName,
      locationType: dto.LocationType,
      locationProfileId: dto.LocationProfileId,
      locationStatus: dto.LocationStatus,
      capacityQty: dto.CapacityQty,
      capacityVolume: dto.CapacityVolume,
      capacityWeight: dto.CapacityWeight,
      palletSlot: dto.PalletSlot,
      temperatureClass: dto.TemperatureClass,
      dgCompatibilityGroup: dto.DgCompatibilityGroup,
      bondedFlag: dto.BondedFlag,
      ownerRestriction: dto.OwnerRestriction,
      mixSkuPolicy: dto.MixSkuPolicy,
      mixLotPolicy: dto.MixLotPolicy,
      mixOwnerPolicy: dto.MixOwnerPolicy,
      pickSequence: dto.PickSequence,
      putawaySequence: dto.PutawaySequence,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toLocationTree(dto: LocationTreeDto): LocationTree {
    return {
      ...MasterDataMapper.toLocation(dto),
      // Defend against a leaf node whose Children array is null/omitted, mirroring
      // the null-guards in `toPaged`/`getLocationTree`.
      children: (dto.Children ?? []).map((child) => MasterDataMapper.toLocationTree(child)),
    };
  },

  toLocationProfile(dto: LocationProfileDto): LocationProfile {
    return {
      id: dto.Id,
      profileCode: dto.ProfileCode,
      profileName: dto.ProfileName,
      locationType: dto.LocationType,
      version: dto.Version,
      status: dto.Status,
      capacityPolicy: dto.CapacityPolicy,
      eligibilityPolicy: dto.EligibilityPolicy,
      mixPolicy: dto.MixPolicy,
      compliancePolicy: dto.CompliancePolicy,
      operationPolicy: dto.OperationPolicy,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toCreateSiteRequest(input: CreateSiteInput): CreateSiteRequestDto {
    return removeUndefined({
      SiteCode: input.siteCode,
      SiteName: input.siteName,
      Status: input.status,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateSiteRequest(input: UpdateSiteInput): UpdateSiteRequestDto {
    return removeUndefined({
      SiteCode: input.siteCode,
      SiteName: input.siteName,
      Status: input.status,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateWarehouseRequest(input: CreateWarehouseInput): CreateWarehouseRequestDto {
    return removeUndefined({
      SiteId: input.siteId,
      WarehouseCode: input.warehouseCode,
      WarehouseName: input.warehouseName,
      WarehouseTypeCode: input.warehouseTypeCode,
      Status: input.status,
      Timezone: input.timezone,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateWarehouseRequest(input: UpdateWarehouseInput): UpdateWarehouseRequestDto {
    return removeUndefined({
      SiteId: input.siteId,
      WarehouseCode: input.warehouseCode,
      WarehouseName: input.warehouseName,
      WarehouseTypeCode: input.warehouseTypeCode,
      Status: input.status,
      Timezone: input.timezone,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateZoneRequest(input: CreateZoneInput): CreateZoneRequestDto {
    return removeUndefined({
      WarehouseId: input.warehouseId,
      ZoneCode: input.zoneCode,
      ZoneName: input.zoneName,
      ZoneType: input.zoneType,
      Status: input.status,
      Sequence: input.sequence,
      TemperatureClass: input.temperatureClass,
      ComplianceFlags: input.complianceFlags,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateZoneRequest(input: UpdateZoneInput): UpdateZoneRequestDto {
    return removeUndefined({
      WarehouseId: input.warehouseId,
      ZoneCode: input.zoneCode,
      ZoneName: input.zoneName,
      ZoneType: input.zoneType,
      Status: input.status,
      Sequence: input.sequence,
      TemperatureClass: input.temperatureClass,
      ComplianceFlags: input.complianceFlags,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateLocationRequest(input: CreateLocationInput): CreateLocationRequestDto {
    return removeUndefined({
      WarehouseId: input.warehouseId,
      ZoneId: input.zoneId,
      ParentLocationId: input.parentLocationId,
      LocationCode: input.locationCode,
      LocationName: input.locationName,
      LocationType: input.locationType,
      LocationProfileId: input.locationProfileId,
      LocationStatus: input.locationStatus,
      CapacityQty: input.capacityQty,
      CapacityVolume: input.capacityVolume,
      CapacityWeight: input.capacityWeight,
      PalletSlot: input.palletSlot,
      TemperatureClass: input.temperatureClass,
      DgCompatibilityGroup: input.dgCompatibilityGroup,
      BondedFlag: input.bondedFlag ?? undefined,
      OwnerRestriction: input.ownerRestriction,
      MixSkuPolicy: input.mixSkuPolicy,
      MixLotPolicy: input.mixLotPolicy,
      MixOwnerPolicy: input.mixOwnerPolicy,
      PickSequence: input.pickSequence,
      PutawaySequence: input.putawaySequence,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toUpdateLocationRequest(input: UpdateLocationInput): UpdateLocationRequestDto {
    return removeUndefined({
      WarehouseId: input.warehouseId,
      ZoneId: input.zoneId,
      ParentLocationId: input.parentLocationId,
      LocationCode: input.locationCode,
      LocationName: input.locationName,
      LocationType: input.locationType,
      LocationProfileId: input.locationProfileId,
      LocationStatus: input.locationStatus,
      CapacityQty: input.capacityQty,
      CapacityVolume: input.capacityVolume,
      CapacityWeight: input.capacityWeight,
      PalletSlot: input.palletSlot,
      TemperatureClass: input.temperatureClass,
      DgCompatibilityGroup: input.dgCompatibilityGroup,
      BondedFlag: input.bondedFlag ?? undefined,
      OwnerRestriction: input.ownerRestriction,
      MixSkuPolicy: input.mixSkuPolicy,
      MixLotPolicy: input.mixLotPolicy,
      MixOwnerPolicy: input.mixOwnerPolicy,
      PickSequence: input.pickSequence,
      PutawaySequence: input.putawaySequence,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
    });
  },

  toCreateLocationProfileRequest(
    input: CreateLocationProfileInput,
  ): CreateLocationProfileRequestDto {
    return removeUndefined({
      ProfileCode: input.profileCode,
      ProfileName: input.profileName,
      LocationType: input.locationType,
      Status: input.status,
      CapacityPolicy: input.capacityPolicy,
      EligibilityPolicy: input.eligibilityPolicy,
      MixPolicy: input.mixPolicy,
      CompliancePolicy: input.compliancePolicy,
      OperationPolicy: input.operationPolicy,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },

  toUpdateLocationProfileRequest(
    input: UpdateLocationProfileInput,
  ): UpdateLocationProfileRequestDto {
    return removeUndefined({
      ProfileCode: input.profileCode,
      ProfileName: input.profileName,
      LocationType: input.locationType,
      Version: input.version,
      Status: input.status,
      CapacityPolicy: input.capacityPolicy,
      EligibilityPolicy: input.eligibilityPolicy,
      MixPolicy: input.mixPolicy,
      CompliancePolicy: input.compliancePolicy,
      OperationPolicy: input.operationPolicy,
      SourceSystem: input.sourceSystem,
      ReferenceId: input.referenceId,
      ReasonCode: input.reasonCode,
    });
  },
};
