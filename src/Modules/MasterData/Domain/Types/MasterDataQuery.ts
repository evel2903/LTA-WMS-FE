import type {
  LocationStatus,
  MasterDataStatus,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';

export interface MasterDataListFilter {
  page?: number;
  pageSize?: number;
  status?: MasterDataStatus;
  siteId?: string;
  siteCode?: string;
  warehouseId?: string;
  warehouseCode?: string;
  warehouseName?: string;
  warehouseTypeCode?: string;
  zoneId?: string;
  zoneCode?: string;
  locationStatus?: LocationStatus;
  locationType?: string;
  locationProfileId?: string;
  locationCode?: string;
  profileCode?: string;
}

export interface LocationTreeFilter {
  warehouseId: string;
  zoneId?: string;
}
