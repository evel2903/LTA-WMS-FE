import type { ISODateString } from '@shared/Types/Common';

export type MasterDataStatus = 'Active' | 'Inactive';
export type LocationStatus = 'Active' | 'Inactive' | 'Blocked' | 'Maintenance';

export interface MasterDataAuditFields {
  sourceSystem: string | null;
  referenceId: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface Site extends MasterDataAuditFields {
  id: string;
  siteCode: string;
  siteName: string;
  status: MasterDataStatus;
}

export interface Warehouse extends MasterDataAuditFields {
  id: string;
  siteId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseTypeCode: string;
  status: MasterDataStatus;
  timezone: string | null;
}

export interface Zone extends MasterDataAuditFields {
  id: string;
  warehouseId: string;
  zoneCode: string;
  zoneName: string;
  zoneType: string;
  status: MasterDataStatus;
  sequence: number | null;
  temperatureClass: string | null;
  complianceFlags: Record<string, unknown>;
}

export interface Location extends MasterDataAuditFields {
  id: string;
  warehouseId: string;
  zoneId: string;
  parentLocationId: string | null;
  locationCode: string;
  locationName: string;
  locationType: string;
  locationProfileId: string;
  locationStatus: LocationStatus;
  capacityQty: number | null;
  capacityVolume: number | null;
  capacityWeight: number | null;
  palletSlot: number | null;
  temperatureClass: string | null;
  dgCompatibilityGroup: string | null;
  bondedFlag: boolean;
  ownerRestriction: string | null;
  mixSkuPolicy: string | null;
  mixLotPolicy: string | null;
  mixOwnerPolicy: string | null;
  pickSequence: number | null;
  putawaySequence: number | null;
}

export interface LocationTree extends Location {
  children: LocationTree[];
}

export interface LocationProfile extends MasterDataAuditFields {
  id: string;
  profileCode: string;
  profileName: string;
  locationType: string;
  version: number;
  status: MasterDataStatus;
  capacityPolicy: Record<string, unknown>;
  eligibilityPolicy: Record<string, unknown>;
  mixPolicy: Record<string, unknown>;
  compliancePolicy: Record<string, unknown>;
  operationPolicy: Record<string, unknown>;
}
