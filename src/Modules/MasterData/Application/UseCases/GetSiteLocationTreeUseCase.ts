import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  LocationTree,
  Site,
  SiteLocationTree,
  Warehouse,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';

function siteNode(site: Site, children: SiteLocationTree[]): SiteLocationTree {
  return {
    id: site.id,
    type: 'site',
    label: `${site.siteCode} - ${site.siteName}`,
    status: site.status,
    entity: site,
    children,
  };
}

function warehouseNode(warehouse: Warehouse, children: SiteLocationTree[]): SiteLocationTree {
  return {
    id: warehouse.id,
    type: 'warehouse',
    label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
    status: warehouse.status,
    entity: warehouse,
    children,
  };
}

function zoneNode(zone: Zone, children: SiteLocationTree[]): SiteLocationTree {
  return {
    id: zone.id,
    type: 'zone',
    label: `${zone.zoneCode} - ${zone.zoneName}`,
    status: zone.status,
    entity: zone,
    children,
  };
}

function locationNode(location: LocationTree): SiteLocationTree {
  return {
    id: location.id,
    type: 'location',
    label: `${location.locationCode} - ${location.locationName}`,
    status: location.locationStatus,
    entity: location,
    children: location.children.map(locationNode),
  };
}

/**
 * Sites/Warehouses/Zones are filtered server-side by `status`, but the location
 * tree endpoint has no status param. To keep the four tree levels consistent,
 * filter locations (and their nested children) client-side to the same status.
 */
function filterLocationsByStatus(
  locations: LocationTree[],
  status?: MasterDataStatus,
): LocationTree[] {
  if (!status) return locations;
  return locations
    .filter((location) => location.locationStatus === status)
    .map((location) => ({
      ...location,
      children: filterLocationsByStatus(location.children, status),
    }));
}

export class GetSiteLocationTreeUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  async execute(filter: MasterDataListFilter = {}): Promise<SiteLocationTree[]> {
    const [sites, warehouses, zones] = await Promise.all([
      this.masterDataRepository.listSites({ page: 1, pageSize: 100, status: filter.status }),
      this.masterDataRepository.listWarehouses({ page: 1, pageSize: 100, status: filter.status }),
      this.masterDataRepository.listZones({ page: 1, pageSize: 100, status: filter.status }),
    ]);

    const locationsByWarehouse = new Map<string, LocationTree[]>();
    await Promise.all(
      warehouses.items.map(async (warehouse) => {
        try {
          const locations = await this.masterDataRepository.getLocationTree({
            warehouseId: warehouse.id,
          });
          locationsByWarehouse.set(warehouse.id, filterLocationsByStatus(locations, filter.status));
        } catch (error) {
          // A single warehouse failing (e.g. a 403 scope error) must not collapse
          // the whole tree; degrade that warehouse to no locations instead. Log the
          // failure so the degrade is observable rather than silently swallowed.
          console.warn(
            'GetSiteLocationTreeUseCase: failed to load location tree for warehouse',
            warehouse.id,
            error,
          );
          locationsByWarehouse.set(warehouse.id, []);
        }
      }),
    );

    return sites.items.map((site) => {
      const warehouseChildren = warehouses.items
        .filter((warehouse) => warehouse.siteId === site.id)
        .map((warehouse) => {
          const warehouseLocations = locationsByWarehouse.get(warehouse.id) ?? [];
          const zoneChildren = zones.items
            .filter((zone) => zone.warehouseId === warehouse.id)
            .map((zone) => {
              const locationChildren = warehouseLocations
                .filter((location) => location.zoneId === zone.id)
                .map(locationNode);
              return zoneNode(zone, locationChildren);
            });
          return warehouseNode(warehouse, zoneChildren);
        });

      return siteNode(site, warehouseChildren);
    });
  }
}
