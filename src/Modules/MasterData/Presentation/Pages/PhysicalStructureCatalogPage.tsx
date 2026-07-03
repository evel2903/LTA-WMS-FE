import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useActiveWarehouseTypes } from '@modules/MasterData/Application/Queries/UseWarehouseTypes';
import type {
  Location,
  LocationProfile,
  Site,
  SiteLocationTree,
  Warehouse,
  WarehouseType,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import { LocationForm } from '@modules/MasterData/Presentation/Forms/LocationForm';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { WarehouseForm } from '@modules/MasterData/Presentation/Forms/WarehouseForm';
import { ZoneForm } from '@modules/MasterData/Presentation/Forms/ZoneForm';

export type PhysicalStructureCatalogMode = 'sites' | 'warehouses' | 'zones' | 'locations';

const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

type SiteNode = Extract<SiteLocationTree, { type: 'site' }>;
type WarehouseNode = Extract<SiteLocationTree, { type: 'warehouse' }>;
type ZoneNode = Extract<SiteLocationTree, { type: 'zone' }>;
type LocationNode = Extract<SiteLocationTree, { type: 'location' }>;

interface SiteRow {
  site: SiteNode;
  warehouseCount: number;
  zoneCount: number;
  locationCount: number;
}

interface WarehouseRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zoneCount: number;
  locationCount: number;
}

interface ZoneRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zone: ZoneNode;
  locationCount: number;
}

interface LocationRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zone: ZoneNode;
  location: LocationNode;
}

function countDescendants(node: SiteLocationTree, type: SiteLocationTree['type']): number {
  return node.children.reduce((total, child) => {
    const own = child.type === type ? 1 : 0;
    return total + own + countDescendants(child, type);
  }, 0);
}

function siteRows(nodes: SiteLocationTree[]): SiteRow[] {
  return nodes
    .filter((node): node is SiteNode => node.type === 'site')
    .map((site) => ({
      site,
      warehouseCount: countDescendants(site, 'warehouse'),
      zoneCount: countDescendants(site, 'zone'),
      locationCount: countDescendants(site, 'location'),
    }));
}

function warehouseRows(nodes: SiteLocationTree[]): WarehouseRow[] {
  return siteRows(nodes).flatMap(({ site }) =>
    site.children
      .filter((child): child is WarehouseNode => child.type === 'warehouse')
      .map((warehouse) => ({
        site,
        warehouse,
        zoneCount: countDescendants(warehouse, 'zone'),
        locationCount: countDescendants(warehouse, 'location'),
      })),
  );
}

function zoneRows(nodes: SiteLocationTree[]): ZoneRow[] {
  return warehouseRows(nodes).flatMap(({ site, warehouse }) =>
    warehouse.children
      .filter((child): child is ZoneNode => child.type === 'zone')
      .map((zone) => ({
        site,
        warehouse,
        zone,
        locationCount: countDescendants(zone, 'location'),
      })),
  );
}

function collectLocationNodes(node: SiteLocationTree): LocationNode[] {
  return node.children.flatMap((child) => {
    const own = child.type === 'location' ? [child] : [];
    return [...own, ...collectLocationNodes(child)];
  });
}

function locationRows(nodes: SiteLocationTree[]): LocationRow[] {
  return zoneRows(nodes).flatMap(({ site, warehouse, zone }) =>
    collectLocationNodes(zone).map((location) => ({ site, warehouse, zone, location })),
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'Active':
      return 'Đang hoạt động';
    case 'Inactive':
      return 'Không hoạt động';
    case 'Blocked':
      return 'Bị khóa';
    case 'Maintenance':
      return 'Bảo trì';
    default:
      return status;
  }
}

type PhysicalAddressPart = 'aisle' | 'rack' | 'level' | 'bin';

function explicitPhysicalField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function physicalField(location: Location, part: PhysicalAddressPart): string {
  return physicalFilterValue(location, part) || 'Chưa cấu hình';
}

function physicalFilterValue(location: Location, part: PhysicalAddressPart): string {
  const explicit =
    part === 'aisle'
      ? explicitPhysicalField(location.aisleCode)
      : part === 'rack'
        ? explicitPhysicalField(location.rackCode)
        : part === 'level'
          ? explicitPhysicalField(location.levelCode)
          : explicitPhysicalField(location.binCode);

  return explicit ?? fallbackPhysicalField(location, part) ?? '';
}

function fallbackPhysicalField(location: Location, part: PhysicalAddressPart): string | null {
  const parts = physicalNumericParts(location.locationCode);
  const order = positiveLocationOrder(location);
  const value =
    part === 'aisle'
      ? parts[0]
      : part === 'rack'
        ? (parts[1] ?? order)
        : part === 'level'
          ? (parts[2] ?? (parts.length > 0 ? 1 : null))
          : (parts[3] ?? order ?? parts[1] ?? (parts.length > 0 ? 1 : null));

  return value == null ? null : String(value).padStart(2, '0');
}

function physicalNumericParts(code: string): number[] {
  return (code.match(/\d+/g) ?? []).map((part) => Number(part)).filter(Number.isFinite);
}

function positiveLocationOrder(location: Location): number | null {
  const order = location.pickSequence ?? location.putawaySequence ?? null;
  return typeof order === 'number' && order > 0 ? order : null;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function FormModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <button aria-label="Đóng lớp phủ" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <section
        aria-label={title}
        aria-modal="true"
        className="relative z-10 w-full max-w-xl rounded-md border bg-background p-5 shadow-lg"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ParentSiteSelect({
  sites,
  selectedSiteId,
  onChange,
}: {
  sites: SiteRow[];
  selectedSiteId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      Site
      <select
        className="h-10 rounded-md border bg-background px-3 text-sm"
        value={selectedSiteId}
        onChange={(event) => onChange(event.target.value)}
      >
        {sites.map(({ site }) => (
          <option key={site.id} value={site.id}>
            {site.entity.siteCode} - {site.entity.siteName}
          </option>
        ))}
      </select>
    </label>
  );
}

function ParentWarehouseSelect({
  warehouses,
  selectedWarehouseId,
  onChange,
}: {
  warehouses: WarehouseRow[];
  selectedWarehouseId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      Kho
      <select
        className="h-10 rounded-md border bg-background px-3 text-sm"
        value={selectedWarehouseId}
        onChange={(event) => onChange(event.target.value)}
      >
        {warehouses.map(({ warehouse }) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.entity.warehouseCode} - {warehouse.entity.warehouseName}
          </option>
        ))}
      </select>
    </label>
  );
}

function ParentZoneSelect({
  zones,
  selectedZoneId,
  onChange,
}: {
  zones: ZoneRow[];
  selectedZoneId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      Zone
      <select
        className="h-10 rounded-md border bg-background px-3 text-sm"
        value={selectedZoneId}
        onChange={(event) => onChange(event.target.value)}
      >
        {zones.map(({ warehouse, zone }) => (
          <option key={zone.id} value={zone.id}>
            {warehouse.entity.warehouseCode} · {zone.entity.zoneCode} - {zone.entity.zoneName}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PhysicalStructureCatalogPage({ mode }: { mode: PhysicalStructureCatalogMode }) {
  const treeQuery = useSiteLocationTree();
  const profilesQuery = useLocationProfiles({ status: 'Active' });
  const warehouseTypesQuery = useActiveWarehouseTypes();
  const mutations = useMasterDataMutations();
  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const sites = useMemo(() => siteRows(nodes), [nodes]);
  const warehouses = useMemo(() => warehouseRows(nodes), [nodes]);
  const zones = useMemo(() => zoneRows(nodes), [nodes]);
  const locations = useMemo(() => locationRows(nodes), [nodes]);
  const locationProfiles = profilesQuery.data?.items ?? [];
  const warehouseTypes = warehouseTypesQuery.data?.items ?? [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [aisleFilter, setAisleFilter] = useState('all');
  const [rackFilter, setRackFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [createSiteId, setCreateSiteId] = useState('');
  const [createWarehouseId, setCreateWarehouseId] = useState('');
  const [createZoneId, setCreateZoneId] = useState('');

  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('');
    setSiteFilter('all');
    setWarehouseFilter('all');
    setZoneFilter('all');
    setAisleFilter('all');
    setRackFilter('all');
    setCreateOpen(false);
    setEditingSite(null);
    setEditingWarehouse(null);
    setEditingZone(null);
    setEditingLocation(null);
  }, [mode]);

  useEffect(() => {
    setCreateSiteId((current) =>
      current && sites.some(({ site }) => site.id === current) ? current : (sites[0]?.site.id ?? ''),
    );
  }, [sites]);

  useEffect(() => {
    setCreateWarehouseId((current) =>
      current && warehouses.some(({ warehouse }) => warehouse.id === current)
        ? current
        : (warehouses[0]?.warehouse.id ?? ''),
    );
  }, [warehouses]);

  useEffect(() => {
    setCreateZoneId((current) =>
      current && zones.some(({ zone }) => zone.id === current) ? current : (zones[0]?.zone.id ?? ''),
    );
  }, [zones]);

  const handleSiteFilter = (value: string) => {
    setSiteFilter(value);
    setWarehouseFilter('all');
    setZoneFilter('all');
    setAisleFilter('all');
    setRackFilter('all');
  };
  const handleWarehouseFilter = (value: string) => {
    setWarehouseFilter(value);
    setZoneFilter('all');
    setAisleFilter('all');
    setRackFilter('all');
  };
  const handleZoneFilter = (value: string) => {
    setZoneFilter(value);
    setAisleFilter('all');
    setRackFilter('all');
  };

  const pageState = apiError?.isForbidden
    ? 'forbidden'
    : treeQuery.isLoading
      ? 'loading'
      : treeQuery.error
        ? 'error'
        : null;

  const title =
    mode === 'sites'
      ? 'Site'
      : mode === 'warehouses'
        ? 'Kho'
        : mode === 'zones'
          ? 'Zone'
          : 'Vị trí vật lý';
  const description =
    mode === 'sites'
      ? 'Quản lý site bằng bảng trước khi cấu hình kho và sơ đồ.'
      : mode === 'warehouses'
        ? 'Quản lý kho bằng bảng và mở sơ đồ cấu trúc vật lý khi cần xem chi tiết.'
        : mode === 'zones'
          ? 'Quản lý zone theo kho bằng bảng; sơ đồ hóa zone sẽ làm ở story sau.'
          : 'Quản lý dãy, kệ/shelf, tầng và ô/bin của từng vị trí bằng bảng.';
  const canCreate =
    !apiError?.isForbidden &&
    (mode === 'sites' ||
      (mode === 'warehouses' && sites.length > 0) ||
      (mode === 'zones' && warehouses.length > 0) ||
      (mode === 'locations' && zones.length > 0));

  const commonFilters = (
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
      <label className="grid min-w-0 gap-1 text-sm">
        Tìm
        <Input
          className="min-w-0"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Mã hoặc tên"
        />
      </label>
      <label className="grid min-w-0 gap-1 text-sm">
        Trạng thái
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
          {mode === 'locations' ? (
            <>
              <option value="Blocked">Bị khóa</option>
              <option value="Maintenance">Bảo trì</option>
            </>
          ) : null}
        </select>
      </label>
    </div>
  );

  const toolbar = canCreate ? (
    <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
      Tạo {title.toLocaleLowerCase('vi-VN')}
    </Button>
  ) : null;

  return (
    <>
      <ListPageShell
        title={title}
        description={description}
        toolbar={toolbar}
        filters={
          mode === 'sites' ? (
            commonFilters
          ) : (
            <div className="space-y-3">
              {commonFilters}
              <ScopeFilters
                mode={mode}
                sites={sites}
                warehouses={warehouses}
                zones={zones}
                locations={locations}
                siteFilter={siteFilter}
                warehouseFilter={warehouseFilter}
                zoneFilter={zoneFilter}
                aisleFilter={aisleFilter}
                rackFilter={rackFilter}
                onSiteFilter={handleSiteFilter}
                onWarehouseFilter={handleWarehouseFilter}
                onZoneFilter={handleZoneFilter}
                onAisleFilter={setAisleFilter}
                onRackFilter={setRackFilter}
              />
            </div>
          )
        }
        state={pageState}
        stateTitle={pageState === 'forbidden' ? 'Không có quyền' : undefined}
        stateMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu cấu trúc vật lý.' : undefined)}
      >
        {mode === 'sites' ? (
          <SiteTable
            rows={filterSiteRows(sites, searchTerm, statusFilter)}
            onEdit={(site) => setEditingSite(site.entity)}
          />
        ) : null}
        {mode === 'warehouses' ? (
          <WarehouseTable
            rows={filterWarehouseRows(warehouses, searchTerm, statusFilter, siteFilter)}
            onEdit={(warehouse) => setEditingWarehouse(warehouse.entity)}
          />
        ) : null}
        {mode === 'zones' ? (
          <ZoneTable
            rows={filterZoneRows(zones, searchTerm, statusFilter, siteFilter, warehouseFilter)}
            onEdit={(zone) => setEditingZone(zone.entity)}
          />
        ) : null}
        {mode === 'locations' ? (
          <LocationTable
            rows={filterLocationRows(
              locations,
              searchTerm,
              statusFilter,
              siteFilter,
              warehouseFilter,
              zoneFilter,
              aisleFilter,
              rackFilter,
            )}
            locationProfiles={locationProfiles}
            onEdit={(location) => setEditingLocation(location.entity)}
          />
        ) : null}
      </ListPageShell>

      <CreateModal
        mode={mode}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        sites={sites}
        warehouses={warehouses}
        zones={zones}
        locationProfiles={locationProfiles}
        warehouseTypes={warehouseTypes}
        createSiteId={createSiteId}
        createWarehouseId={createWarehouseId}
        createZoneId={createZoneId}
        onCreateSiteId={setCreateSiteId}
        onCreateWarehouseId={setCreateWarehouseId}
        onCreateZoneId={setCreateZoneId}
        mutations={mutations}
      />

      <FormModal title="Cập nhật site" open={editingSite != null} onClose={() => setEditingSite(null)}>
        {editingSite ? (
          <SiteForm
            key={editingSite.id}
            initialValue={editingSite}
            submitLabel="Cập nhật site"
            pending={mutations.updateSite.isPending}
            onSubmit={(values) =>
              mutations.updateSite.mutate({ id: editingSite.id, input: values }, { onSuccess: () => setEditingSite(null) })
            }
          />
        ) : null}
      </FormModal>
      <FormModal title="Cập nhật kho" open={editingWarehouse != null} onClose={() => setEditingWarehouse(null)}>
        {editingWarehouse ? (
          <WarehouseForm
            key={editingWarehouse.id}
            initialValue={editingWarehouse}
            warehouseTypes={warehouseTypes}
            submitLabel="Cập nhật kho"
            pending={mutations.updateWarehouse.isPending}
            onSubmit={(values) =>
              mutations.updateWarehouse.mutate(
                { id: editingWarehouse.id, input: values },
                { onSuccess: () => setEditingWarehouse(null) },
              )
            }
          />
        ) : null}
      </FormModal>
      <FormModal title="Cập nhật zone" open={editingZone != null} onClose={() => setEditingZone(null)}>
        {editingZone ? (
          <ZoneForm
            key={editingZone.id}
            initialValue={editingZone}
            submitLabel="Cập nhật zone"
            pending={mutations.updateZone.isPending}
            onSubmit={(values) =>
              mutations.updateZone.mutate({ id: editingZone.id, input: values }, { onSuccess: () => setEditingZone(null) })
            }
          />
        ) : null}
      </FormModal>
      <FormModal title="Cập nhật vị trí vật lý" open={editingLocation != null} onClose={() => setEditingLocation(null)}>
        {editingLocation ? (
          <LocationForm
            key={editingLocation.id}
            initialValue={editingLocation}
            locationProfiles={locationProfiles}
            submitLabel="Cập nhật vị trí"
            pending={mutations.updateLocation.isPending}
            onSubmit={(values) =>
              mutations.updateLocation.mutate(
                { id: editingLocation.id, input: values },
                { onSuccess: () => setEditingLocation(null) },
              )
            }
          />
        ) : null}
      </FormModal>
    </>
  );
}

function ScopeFilters({
  mode,
  sites,
  warehouses,
  zones,
  locations,
  siteFilter,
  warehouseFilter,
  zoneFilter,
  aisleFilter,
  rackFilter,
  onSiteFilter,
  onWarehouseFilter,
  onZoneFilter,
  onAisleFilter,
  onRackFilter,
}: {
  mode: PhysicalStructureCatalogMode;
  sites: SiteRow[];
  warehouses: WarehouseRow[];
  zones: ZoneRow[];
  locations: LocationRow[];
  siteFilter: string;
  warehouseFilter: string;
  zoneFilter: string;
  aisleFilter: string;
  rackFilter: string;
  onSiteFilter: (value: string) => void;
  onWarehouseFilter: (value: string) => void;
  onZoneFilter: (value: string) => void;
  onAisleFilter: (value: string) => void;
  onRackFilter: (value: string) => void;
}) {
  const scopedWarehouses = useMemo(
    () => warehouses.filter(({ site }) => siteFilter === 'all' || site.id === siteFilter),
    [siteFilter, warehouses],
  );
  const scopedZones = useMemo(
    () =>
      zones.filter(
        ({ site, warehouse }) =>
          (siteFilter === 'all' || site.id === siteFilter) &&
          (warehouseFilter === 'all' || warehouse.id === warehouseFilter),
      ),
    [siteFilter, warehouseFilter, zones],
  );
  const scopedLocations = useMemo(
    () =>
      locations.filter(
        ({ site, warehouse, zone }) =>
          (siteFilter === 'all' || site.id === siteFilter) &&
          (warehouseFilter === 'all' || warehouse.id === warehouseFilter) &&
          (zoneFilter === 'all' || zone.id === zoneFilter),
      ),
    [locations, siteFilter, warehouseFilter, zoneFilter],
  );
  const aisleOptions = useMemo(
    () =>
      Array.from(new Set(scopedLocations.map(({ location }) => physicalFilterValue(location.entity, 'aisle')).filter(Boolean))).sort(),
    [scopedLocations],
  );
  const rackOptions = useMemo(
    () =>
      Array.from(new Set(scopedLocations.map(({ location }) => physicalFilterValue(location.entity, 'rack')).filter(Boolean))).sort(),
    [scopedLocations],
  );

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <label className="grid min-w-0 gap-1 text-sm">
        Site
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={siteFilter}
          onChange={(event) => onSiteFilter(event.target.value)}
        >
          <option value="all">Tất cả site</option>
          {sites.map(({ site }) => (
            <option key={site.id} value={site.id}>
              {site.entity.siteCode} - {site.entity.siteName}
            </option>
          ))}
        </select>
      </label>
      {mode !== 'warehouses' ? (
        <label className="grid min-w-0 gap-1 text-sm">
          Kho
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={warehouseFilter}
            onChange={(event) => onWarehouseFilter(event.target.value)}
          >
            <option value="all">Tất cả kho</option>
            {scopedWarehouses.map(({ warehouse }) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.entity.warehouseCode} - {warehouse.entity.warehouseName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {mode === 'locations' ? (
        <>
          <label className="grid min-w-0 gap-1 text-sm">
            Zone
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={zoneFilter}
              onChange={(event) => onZoneFilter(event.target.value)}
            >
              <option value="all">Tất cả zone</option>
              {scopedZones.map(({ warehouse, zone }) => (
                <option key={zone.id} value={zone.id}>
                  {warehouse.entity.warehouseCode} · {zone.entity.zoneCode}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            Dãy
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={aisleFilter}
              onChange={(event) => onAisleFilter(event.target.value)}
            >
              <option value="all">Tất cả</option>
              {aisleOptions.map((aisle) => (
                <option key={aisle} value={aisle}>
                  {aisle}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            Kệ
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={rackFilter}
              onChange={(event) => onRackFilter(event.target.value)}
            >
              <option value="all">Tất cả</option>
              {rackOptions.map((rack) => (
                <option key={rack} value={rack}>
                  {rack}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
    </div>
  );
}

function CreateModal({
  mode,
  open,
  onClose,
  sites,
  warehouses,
  zones,
  locationProfiles,
  warehouseTypes,
  createSiteId,
  createWarehouseId,
  createZoneId,
  onCreateSiteId,
  onCreateWarehouseId,
  onCreateZoneId,
  mutations,
}: {
  mode: PhysicalStructureCatalogMode;
  open: boolean;
  onClose: () => void;
  sites: SiteRow[];
  warehouses: WarehouseRow[];
  zones: ZoneRow[];
  locationProfiles: LocationProfile[];
  warehouseTypes: WarehouseType[];
  createSiteId: string;
  createWarehouseId: string;
  createZoneId: string;
  onCreateSiteId: (value: string) => void;
  onCreateWarehouseId: (value: string) => void;
  onCreateZoneId: (value: string) => void;
  mutations: ReturnType<typeof useMasterDataMutations>;
}) {
  const selectedZone = zones.find(({ zone }) => zone.id === createZoneId)?.zone;

  return (
    <FormModal title={`Tạo ${mode === 'locations' ? 'vị trí vật lý' : mode === 'warehouses' ? 'kho' : mode === 'zones' ? 'zone' : 'site'}`} open={open} onClose={onClose}>
      {mode === 'sites' ? (
        <SiteForm
          submitLabel="Tạo site"
          pending={mutations.createSite.isPending}
          onSubmit={(values) => mutations.createSite.mutate(values, { onSuccess: onClose })}
        />
      ) : null}
      {mode === 'warehouses' ? (
        sites.length > 0 ? (
          <div className="grid gap-4">
            <ParentSiteSelect sites={sites} selectedSiteId={createSiteId} onChange={onCreateSiteId} />
            <WarehouseForm
              key={createSiteId}
              siteId={createSiteId}
              warehouseTypes={warehouseTypes}
              submitLabel="Tạo kho"
              pending={mutations.createWarehouse.isPending}
              onSubmit={(values) => mutations.createWarehouse.mutate(values, { onSuccess: onClose })}
            />
          </div>
        ) : (
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có site</AlertTitle>
            <AlertDescription>Tạo site trước khi tạo kho.</AlertDescription>
          </Alert>
        )
      ) : null}
      {mode === 'zones' ? (
        warehouses.length > 0 ? (
          <div className="grid gap-4">
            <ParentWarehouseSelect
              warehouses={warehouses}
              selectedWarehouseId={createWarehouseId}
              onChange={onCreateWarehouseId}
            />
            <ZoneForm
              key={createWarehouseId}
              warehouseId={createWarehouseId}
              submitLabel="Tạo zone"
              pending={mutations.createZone.isPending}
              onSubmit={(values) => mutations.createZone.mutate(values, { onSuccess: onClose })}
            />
          </div>
        ) : (
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có kho</AlertTitle>
            <AlertDescription>Tạo kho trước khi tạo zone.</AlertDescription>
          </Alert>
        )
      ) : null}
      {mode === 'locations' ? (
        selectedZone ? (
          <div className="grid gap-4">
            <ParentZoneSelect zones={zones} selectedZoneId={createZoneId} onChange={onCreateZoneId} />
            <LocationForm
              key={createZoneId}
              warehouseId={selectedZone.entity.warehouseId}
              zoneId={selectedZone.id}
              locationProfiles={locationProfiles}
              submitLabel="Tạo vị trí"
              pending={mutations.createLocation.isPending}
              onSubmit={(values) => mutations.createLocation.mutate(values, { onSuccess: onClose })}
            />
          </div>
        ) : (
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có zone</AlertTitle>
            <AlertDescription>Tạo zone trước khi tạo vị trí.</AlertDescription>
          </Alert>
        )
      ) : null}
    </FormModal>
  );
}

function filterSiteRows(rows: SiteRow[], searchTerm: string, statusFilter: string): SiteRow[] {
  const search = normalized(searchTerm);
  return rows.filter(({ site }) => {
    const searchSource = `${site.entity.siteCode} ${site.entity.siteName}`.toLocaleLowerCase('vi-VN');
    return (!search || searchSource.includes(search)) && (!statusFilter || site.status === statusFilter);
  });
}

function filterWarehouseRows(
  rows: WarehouseRow[],
  searchTerm: string,
  statusFilter: string,
  siteFilter: string,
): WarehouseRow[] {
  const search = normalized(searchTerm);
  return rows.filter(({ site, warehouse }) => {
    const searchSource = `${site.entity.siteCode} ${warehouse.entity.warehouseCode} ${warehouse.entity.warehouseName}`.toLocaleLowerCase('vi-VN');
    return (
      (!search || searchSource.includes(search)) &&
      (!statusFilter || warehouse.status === statusFilter) &&
      (siteFilter === 'all' || site.id === siteFilter)
    );
  });
}

function filterZoneRows(
  rows: ZoneRow[],
  searchTerm: string,
  statusFilter: string,
  siteFilter: string,
  warehouseFilter: string,
): ZoneRow[] {
  const search = normalized(searchTerm);
  return rows.filter(({ site, warehouse, zone }) => {
    const searchSource = `${site.entity.siteCode} ${warehouse.entity.warehouseCode} ${zone.entity.zoneCode} ${zone.entity.zoneName}`.toLocaleLowerCase('vi-VN');
    return (
      (!search || searchSource.includes(search)) &&
      (!statusFilter || zone.status === statusFilter) &&
      (siteFilter === 'all' || site.id === siteFilter) &&
      (warehouseFilter === 'all' || warehouse.id === warehouseFilter)
    );
  });
}

function filterLocationRows(
  rows: LocationRow[],
  searchTerm: string,
  statusFilter: string,
  siteFilter: string,
  warehouseFilter: string,
  zoneFilter: string,
  aisleFilter: string,
  rackFilter: string,
): LocationRow[] {
  const search = normalized(searchTerm);
  return rows.filter(({ site, warehouse, zone, location }) => {
    const aisle = physicalFilterValue(location.entity, 'aisle');
    const rack = physicalFilterValue(location.entity, 'rack');
    const level = physicalFilterValue(location.entity, 'level');
    const bin = physicalFilterValue(location.entity, 'bin');
    const searchSource = [
      site.entity.siteCode,
      warehouse.entity.warehouseCode,
      zone.entity.zoneCode,
      location.entity.locationCode,
      location.entity.locationName,
      aisle,
      rack,
      level,
      bin,
    ].join(' ').toLocaleLowerCase('vi-VN');
    return (
      (!search || searchSource.includes(search)) &&
      (!statusFilter || location.status === statusFilter) &&
      (siteFilter === 'all' || site.id === siteFilter) &&
      (warehouseFilter === 'all' || warehouse.id === warehouseFilter) &&
      (zoneFilter === 'all' || zone.id === zoneFilter) &&
      (aisleFilter === 'all' || aisle === aisleFilter) &&
      (rackFilter === 'all' || rack === rackFilter)
    );
  });
}

function SiteTable({ rows, onEdit }: { rows: SiteRow[]; onEdit: (site: SiteNode) => void }) {
  if (rows.length === 0) return <EmptyTableMessage message="Không có site phù hợp." />;

  return (
    <ResponsiveTable
      desktop={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã site</TableHead>
              <TableHead>Tên site</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Kho</TableHead>
              <TableHead className="text-right">Zone</TableHead>
              <TableHead className="text-right">Vị trí</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.site.id}>
                <TableCell className="font-medium">{row.site.entity.siteCode}</TableCell>
                <TableCell>{row.site.entity.siteName}</TableCell>
                <TableCell>
                  <Badge variant={masterDataStatusVariant(row.site.status)}>{statusLabel(row.site.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.warehouseCount}</TableCell>
                <TableCell className="text-right">{row.zoneCount}</TableCell>
                <TableCell className="text-right">{row.locationCount}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.site)}>
                    Sửa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
      mobile={rows.map((row) => (
        <EntityCard key={row.site.id} title={row.site.entity.siteCode} subtitle={row.site.entity.siteName}>
          <Badge variant={masterDataStatusVariant(row.site.status)}>{statusLabel(row.site.status)}</Badge>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.site)}>
            Sửa
          </Button>
        </EntityCard>
      ))}
    />
  );
}

function WarehouseTable({ rows, onEdit }: { rows: WarehouseRow[]; onEdit: (warehouse: WarehouseNode) => void }) {
  if (rows.length === 0) return <EmptyTableMessage message="Không có kho phù hợp." />;

  return (
    <ResponsiveTable
      desktop={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Mã kho</TableHead>
              <TableHead>Tên kho</TableHead>
              <TableHead>Loại kho</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Zone</TableHead>
              <TableHead className="text-right">Vị trí</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.warehouse.id}>
                <TableCell>{row.site.entity.siteCode}</TableCell>
                <TableCell className="font-medium">{row.warehouse.entity.warehouseCode}</TableCell>
                <TableCell>{row.warehouse.entity.warehouseName}</TableCell>
                <TableCell>{row.warehouse.entity.warehouseTypeCode}</TableCell>
                <TableCell>
                  <Badge variant={masterDataStatusVariant(row.warehouse.status)}>
                    {statusLabel(row.warehouse.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{row.zoneCount}</TableCell>
                <TableCell className="text-right">{row.locationCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.warehouse)}>
                      Sửa
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        aria-label={`Sơ đồ kho ${row.warehouse.entity.warehouseCode}`}
                        to={ROUTES.FOUNDATION.LOCATION_MAP(row.warehouse.id)}
                      >
                        Sơ đồ kho
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
      mobile={rows.map((row) => (
        <EntityCard key={row.warehouse.id} title={row.warehouse.entity.warehouseCode} subtitle={row.warehouse.entity.warehouseName}>
          <Badge variant={masterDataStatusVariant(row.warehouse.status)}>{statusLabel(row.warehouse.status)}</Badge>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.warehouse)}>
            Sửa
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              aria-label={`Sơ đồ kho ${row.warehouse.entity.warehouseCode}`}
              to={ROUTES.FOUNDATION.LOCATION_MAP(row.warehouse.id)}
            >
              Sơ đồ kho
            </Link>
          </Button>
        </EntityCard>
      ))}
    />
  );
}

function ZoneTable({ rows, onEdit }: { rows: ZoneRow[]; onEdit: (zone: ZoneNode) => void }) {
  if (rows.length === 0) return <EmptyTableMessage message="Không có zone phù hợp." />;

  return (
    <ResponsiveTable
      desktop={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Kho</TableHead>
              <TableHead>Mã zone</TableHead>
              <TableHead>Tên zone</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Vị trí</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.zone.id}>
                <TableCell>{row.site.entity.siteCode}</TableCell>
                <TableCell>{row.warehouse.entity.warehouseCode}</TableCell>
                <TableCell className="font-medium">{row.zone.entity.zoneCode}</TableCell>
                <TableCell>{row.zone.entity.zoneName}</TableCell>
                <TableCell>{row.zone.entity.zoneType}</TableCell>
                <TableCell>
                  <Badge variant={masterDataStatusVariant(row.zone.status)}>{statusLabel(row.zone.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.locationCount}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.zone)}>
                    Sửa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
      mobile={rows.map((row) => (
        <EntityCard key={row.zone.id} title={row.zone.entity.zoneCode} subtitle={row.zone.entity.zoneName}>
          <Badge variant={masterDataStatusVariant(row.zone.status)}>{statusLabel(row.zone.status)}</Badge>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.zone)}>
            Sửa
          </Button>
        </EntityCard>
      ))}
    />
  );
}

function LocationTable({
  rows,
  locationProfiles,
  onEdit,
}: {
  rows: LocationRow[];
  locationProfiles: LocationProfile[];
  onEdit: (location: LocationNode) => void;
}) {
  const profileLabels = new Map(locationProfiles.map((profile) => [profile.id, profile.profileCode]));
  if (rows.length === 0) return <EmptyTableMessage message="Không có vị trí phù hợp." />;

  return (
    <ResponsiveTable
      desktop={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kho</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Mã vị trí</TableHead>
              <TableHead>Dãy</TableHead>
              <TableHead>Kệ/Shelf</TableHead>
              <TableHead>Tầng</TableHead>
              <TableHead>Ô/bin</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.location.id}>
                <TableCell>{row.warehouse.entity.warehouseCode}</TableCell>
                <TableCell>{row.zone.entity.zoneCode}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.location.entity.locationCode}</div>
                  <div className="text-xs text-muted-foreground">{row.location.entity.locationName}</div>
                </TableCell>
                <TableCell>{physicalField(row.location.entity, 'aisle')}</TableCell>
                <TableCell>{physicalField(row.location.entity, 'rack')}</TableCell>
                <TableCell>{physicalField(row.location.entity, 'level')}</TableCell>
                <TableCell>{physicalField(row.location.entity, 'bin')}</TableCell>
                <TableCell>{profileLabels.get(row.location.entity.locationProfileId) ?? row.location.entity.locationProfileId}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.location)}>
                    Sửa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
      mobile={rows.map((row) => (
        <EntityCard key={row.location.id} title={row.location.entity.locationCode} subtitle={row.location.entity.locationName}>
          <span className="text-xs text-muted-foreground">
            {row.warehouse.entity.warehouseCode} · {row.zone.entity.zoneCode}
          </span>
          <dl className="grid w-full grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Dãy</dt>
              <dd className="font-medium">{physicalField(row.location.entity, 'aisle')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kệ/Shelf</dt>
              <dd className="font-medium">{physicalField(row.location.entity, 'rack')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tầng</dt>
              <dd className="font-medium">{physicalField(row.location.entity, 'level')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ô/bin</dt>
              <dd className="font-medium">{physicalField(row.location.entity, 'bin')}</dd>
            </div>
          </dl>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.location)}>
            Sửa
          </Button>
        </EntityCard>
      ))}
    />
  );
}

function ResponsiveTable({ desktop, mobile }: { desktop: ReactNode; mobile: ReactNode }) {
  return (
    <>
      <div className="hidden rounded-md border lg:block">{desktop}</div>
      <div className="grid gap-3 lg:hidden">{mobile}</div>
    </>
  );
}

function EntityCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">{children}</CardContent>
    </Card>
  );
}

function EmptyTableMessage({ message }: { message: string }) {
  return (
    <Alert role="status" variant="info">
      <AlertTitle>Không có dữ liệu</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
