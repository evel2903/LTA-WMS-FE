import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { WarehouseProfileChecklist } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

export type FoundationReadinessStatus = 'ready' | 'warning' | 'missing' | 'error';

export interface FoundationCounts {
  sites: number;
  warehouses: number;
  zones: number;
  locations: number;
}

export interface MasterDataReadinessRow {
  key: keyof FoundationCounts;
  label: string;
  count: number;
  status: FoundationReadinessStatus;
  message: string;
}

export interface WarehouseProfileReadinessRow {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseTypeCode: string;
  activeProfileId: string | null;
  activeProfileCode: string | null;
  activeProfileName: string | null;
  checklist: WarehouseProfileChecklist | null;
  status: FoundationReadinessStatus;
  message: string;
}

export interface QuickLink {
  label: string;
  to: string;
}

export interface FoundationOverviewReadiness {
  overallStatus: FoundationReadinessStatus;
  counts: FoundationCounts;
  masterDataRows: MasterDataReadinessRow[];
  warehouseProfileRows: WarehouseProfileReadinessRow[];
  noDataScope: boolean;
  warnings: string[];
}

export interface BuildFoundationOverviewInput {
  locationTree: SiteLocationTree[];
  activeProfiles: WarehouseProfile[];
  checklists: Record<string, WarehouseProfileChecklist | undefined>;
}
