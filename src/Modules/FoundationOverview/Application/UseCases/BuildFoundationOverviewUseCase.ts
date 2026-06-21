import type {
  BuildFoundationOverviewInput,
  FoundationCounts,
  FoundationOverviewReadiness,
  FoundationReadinessStatus,
  MasterDataReadinessRow,
  WarehouseProfileReadinessRow,
} from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';
import type { Warehouse } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

interface WarehouseNode {
  warehouse: Warehouse;
  locationCount: number;
}

function checklistStatus(status: ProfileChecklistItemStatus): FoundationReadinessStatus {
  if (status === 'PASS') return 'ready';
  if (status === 'FAIL') return 'missing';
  return 'warning';
}

function countLocations(nodes: SiteLocationTree[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === 'location') {
      return total + 1 + countLocations(node.children);
    }
    return total + countLocations(node.children);
  }, 0);
}

function collectWarehouses(tree: SiteLocationTree[]): WarehouseNode[] {
  const warehouses: WarehouseNode[] = [];
  const visit = (nodes: SiteLocationTree[]) => {
    nodes.forEach((node) => {
      if (node.type === 'warehouse') {
        warehouses.push({ warehouse: node.entity, locationCount: countLocations(node.children) });
      }
      visit(node.children);
    });
  };
  visit(tree);
  return warehouses;
}

function collectCounts(tree: SiteLocationTree[], warehouses: WarehouseNode[]): FoundationCounts {
  const counts: FoundationCounts = { sites: 0, warehouses: 0, zones: 0, locations: 0 };
  const visit = (nodes: SiteLocationTree[]) => {
    nodes.forEach((node) => {
      if (node.type === 'site') counts.sites += 1;
      if (node.type === 'warehouse') counts.warehouses += 1;
      if (node.type === 'zone') counts.zones += 1;
      if (node.type === 'location') counts.locations += 1;
      visit(node.children);
    });
  };
  visit(tree);
  counts.warehouses = warehouses.length;
  return counts;
}

function masterRow(
  key: keyof FoundationCounts,
  label: string,
  count: number,
  missingMessage: string,
): MasterDataReadinessRow {
  return {
    key,
    label,
    count,
    status: count > 0 ? 'ready' : 'missing',
    message: count > 0 ? `${count} record(s) visible in current scope.` : missingMessage,
  };
}

function selectProfile(
  warehouse: Warehouse,
  profiles: WarehouseProfile[],
): { selected: WarehouseProfile | null; candidateCount: number } {
  const exact = profiles.filter((profile) => profile.warehouseId === warehouse.id);
  const typeLevel = profiles.filter(
    (profile) => !profile.warehouseId && profile.warehouseTypeCode === warehouse.warehouseTypeCode,
  );
  const candidates = [...exact, ...typeLevel];
  return { selected: exact[0] ?? typeLevel[0] ?? null, candidateCount: candidates.length };
}

export class BuildFoundationOverviewUseCase {
  execute(input: BuildFoundationOverviewInput): FoundationOverviewReadiness {
    const warehouses = collectWarehouses(input.locationTree);
    const counts = collectCounts(input.locationTree, warehouses);
    const masterDataRows: MasterDataReadinessRow[] = [
      masterRow('sites', 'Sites', counts.sites, 'No site is visible for the current scope.'),
      masterRow(
        'warehouses',
        'Warehouses',
        counts.warehouses,
        'No warehouse is visible; this is treated as setup/scope warning.',
      ),
      masterRow(
        'zones',
        'Zones',
        counts.zones,
        'No zone is configured under the visible warehouses.',
      ),
      masterRow(
        'locations',
        'Locations',
        counts.locations,
        'No location is configured under the visible zones.',
      ),
    ];

    const warehouseProfileRows = warehouses.map<WarehouseProfileReadinessRow>((entry) => {
      const { selected, candidateCount } = selectProfile(entry.warehouse, input.activeProfiles);
      if (!selected) {
        return {
          warehouseId: entry.warehouse.id,
          warehouseCode: entry.warehouse.warehouseCode,
          warehouseName: entry.warehouse.warehouseName,
          warehouseTypeCode: entry.warehouse.warehouseTypeCode,
          activeProfileId: null,
          activeProfileCode: null,
          activeProfileName: null,
          checklist: null,
          status: 'missing',
          message: 'No ACTIVE warehouse profile is visible for this warehouse/type.',
        };
      }

      const checklist = input.checklists[selected.id] ?? null;
      const baseStatus = checklist ? checklistStatus(checklist.overallStatus) : 'warning';
      const status: FoundationReadinessStatus =
        candidateCount > 1 && baseStatus === 'ready' ? 'warning' : baseStatus;
      const duplicateNote =
        candidateCount > 1 ? ` ${candidateCount} active profile candidates are visible.` : '';
      const checklistNote = checklist
        ? `Checklist B7 ${checklist.overallStatus}.`
        : 'Checklist B7 result is not available.';

      return {
        warehouseId: entry.warehouse.id,
        warehouseCode: entry.warehouse.warehouseCode,
        warehouseName: entry.warehouse.warehouseName,
        warehouseTypeCode: entry.warehouse.warehouseTypeCode,
        activeProfileId: selected.id,
        activeProfileCode: selected.profileCode,
        activeProfileName: selected.profileName,
        checklist,
        status,
        message: `${checklistNote}${duplicateNote}`,
      };
    });

    const allRows = [...masterDataRows, ...warehouseProfileRows];
    const overallStatus: FoundationReadinessStatus = allRows.some((row) => row.status === 'missing')
      ? 'missing'
      : allRows.some((row) => row.status === 'warning')
        ? 'warning'
        : 'ready';
    const noDataScope = counts.warehouses === 0;

    return {
      overallStatus,
      counts,
      masterDataRows,
      warehouseProfileRows,
      noDataScope,
      warnings: noDataScope
        ? ['No warehouse/owner scope assigned or no warehouse is visible in the current scope.']
        : [],
    };
  }
}
