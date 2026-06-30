import type {
  Location,
  LocationProfile,
  LocationStatus,
  LocationTree,
  MasterDataStatus,
  Site,
  Warehouse,
  WarehouseType,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';

export type SiteLocationNodeType = 'site' | 'warehouse' | 'zone' | 'location';

export type SiteLocationEntity = Site | Warehouse | Zone | Location;

interface SiteLocationTreeNode<
  TType extends SiteLocationNodeType,
  TEntity extends SiteLocationEntity,
  TStatus extends MasterDataStatus | LocationStatus,
> {
  id: string;
  type: TType;
  label: string;
  status: TStatus;
  entity: TEntity;
  children: SiteLocationTree[];
}

export type SiteLocationTree =
  | SiteLocationTreeNode<'site', Site, MasterDataStatus>
  | SiteLocationTreeNode<'warehouse', Warehouse, MasterDataStatus>
  | SiteLocationTreeNode<'zone', Zone, MasterDataStatus>
  | SiteLocationTreeNode<'location', Location, LocationStatus>;

export interface CreateSiteInput {
  siteCode: string;
  siteName: string;
  status: MasterDataStatus;
  sourceSystem?: string;
  referenceId?: string;
}

export type UpdateSiteInput = Partial<CreateSiteInput>;

export interface CreateWarehouseInput {
  siteId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseTypeCode: string;
  status: MasterDataStatus;
  timezone?: string;
  sourceSystem?: string;
  referenceId?: string;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

export interface CreateWarehouseTypeInput {
  warehouseTypeCode: string;
  warehouseTypeName: string;
  description?: string | null;
  status: MasterDataStatus;
  sourceSystem?: string | null;
  referenceId?: string | null;
  reasonCode?: string | null;
}

export type UpdateWarehouseTypeInput = Partial<Omit<CreateWarehouseTypeInput, 'warehouseTypeCode'>>;

export interface CreateZoneInput {
  warehouseId: string;
  zoneCode: string;
  zoneName: string;
  zoneType: string;
  status: MasterDataStatus;
  sequence?: number;
  temperatureClass?: string;
  complianceFlags?: Record<string, unknown>;
  sourceSystem?: string;
  referenceId?: string;
}

export type UpdateZoneInput = Partial<CreateZoneInput>;

export interface CreateLocationInput {
  warehouseId: string;
  zoneId: string;
  parentLocationId?: string | null;
  locationCode: string;
  locationName: string;
  locationType: string;
  locationProfileId: string;
  locationStatus: LocationStatus;
  capacityQty?: number | null;
  capacityVolume?: number | null;
  capacityWeight?: number | null;
  palletSlot?: number | null;
  temperatureClass?: string | null;
  dgCompatibilityGroup?: string | null;
  bondedFlag?: boolean | null;
  ownerRestriction?: string | null;
  mixSkuPolicy?: string | null;
  mixLotPolicy?: string | null;
  mixOwnerPolicy?: string | null;
  pickSequence?: number | null;
  putawaySequence?: number | null;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

export type UpdateLocationInput = Partial<CreateLocationInput>;

export interface CreateLocationProfileInput {
  profileCode: string;
  profileName: string;
  locationType: string;
  status: MasterDataStatus;
  capacityPolicy?: Record<string, unknown>;
  eligibilityPolicy?: Record<string, unknown>;
  mixPolicy?: Record<string, unknown>;
  compliancePolicy?: Record<string, unknown>;
  operationPolicy?: Record<string, unknown>;
  sourceSystem?: string | null;
  referenceId?: string | null;
  reasonCode?: string | null;
}

export type UpdateLocationProfileInput = Partial<CreateLocationProfileInput> & {
  version?: number;
};

export type { Location, LocationProfile, LocationTree, Site, Warehouse, WarehouseType, Zone };
