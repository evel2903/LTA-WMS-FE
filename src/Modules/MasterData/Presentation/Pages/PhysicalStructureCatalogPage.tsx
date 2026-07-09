import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
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
import type {
  Location,
  LocationProfile,
  SiteLocationTree,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  countDescendants,
  normalized,
  type LocationNode,
  type SiteNode,
  type WarehouseNode,
  type ZoneNode,
} from '@modules/MasterData/Presentation/Utils/MasterDataTreeUtils';
import {
  explicitPhysicalField,
  fallbackPhysicalField,
  locationWithPhysicalFallback,
  physicalFieldDisplay,
  physicalFilterValue,
  type PhysicalAddressPart,
} from '@modules/MasterData/Presentation/Components/PhysicalAddressFallback';
import { LocationForm, type LocationFormDirtyFields } from '@modules/MasterData/Presentation/Forms/LocationForm';
import type { LocationFormValues } from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

export type PhysicalStructureCatalogMode = 'locations';

const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

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

function physicalField(location: Location, part: PhysicalAddressPart): string {
  return physicalFieldDisplay(location, part);
}

const physicalFormFields = [
  { field: 'aisleCode', part: 'aisle' },
  { field: 'rackCode', part: 'rack' },
  { field: 'levelCode', part: 'level' },
  { field: 'binCode', part: 'bin' },
] as const satisfies ReadonlyArray<{ field: keyof Pick<LocationFormValues, 'aisleCode' | 'rackCode' | 'levelCode' | 'binCode'>; part: PhysicalAddressPart }>;

function preserveUnchangedPhysicalFallbacks(
  values: LocationFormValues,
  original: Location,
  dirtyFields: LocationFormDirtyFields,
): LocationFormValues {
  const next: LocationFormValues = { ...values };

  physicalFormFields.forEach(({ field, part }) => {
    const originalValue = original[field];
    const explicitValue = explicitPhysicalField(originalValue);
    const fallbackValue = fallbackPhysicalField(original, part);
    if (!dirtyFields[field]) {
      if (!explicitValue && fallbackValue && next[field] === fallbackValue) {
        next[field] = undefined;
      }
      if (explicitValue && next[field] === explicitValue && originalValue !== explicitValue) {
        next[field] = originalValue ?? undefined;
      }
    }
  });

  return next;
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
  const mutations = useMasterDataMutations();
  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const profileApiError = profilesQuery.error instanceof ApiError ? profilesQuery.error : null;
  const sites = useMemo(() => siteRows(nodes), [nodes]);
  const warehouses = useMemo(() => warehouseRows(nodes), [nodes]);
  const zones = useMemo(() => zoneRows(nodes), [nodes]);
  const locations = useMemo(() => locationRows(nodes), [nodes]);
  const locationProfiles = profilesQuery.data?.items ?? [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [aisleFilter, setAisleFilter] = useState('all');
  const [rackFilter, setRackFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [createZoneId, setCreateZoneId] = useState('');
  const warehouseScopeRows = useMemo(
    () => warehouses.filter(({ site }) => siteFilter === 'all' || site.id === siteFilter),
    [siteFilter, warehouses],
  );
  const zoneScopeRows = useMemo(
    () =>
      zones.filter(
        ({ site, warehouse }) =>
          (siteFilter === 'all' || site.id === siteFilter) &&
          (warehouseFilter === 'all' || warehouse.id === warehouseFilter),
      ),
    [siteFilter, warehouseFilter, zones],
  );
  const locationScopeRows = useMemo(
    () =>
      locations.filter(
        ({ site, warehouse, zone }) =>
          (siteFilter === 'all' || site.id === siteFilter) &&
          (warehouseFilter === 'all' || warehouse.id === warehouseFilter) &&
          (zoneFilter === 'all' || zone.id === zoneFilter),
      ),
    [locations, siteFilter, warehouseFilter, zoneFilter],
  );
  const locationTableRows = filterLocationRows(
    locations,
    searchTerm,
    statusFilter,
    siteFilter,
    warehouseFilter,
    zoneFilter,
    aisleFilter,
    rackFilter,
  );
  const locationProfileQueryError =
    mode === 'locations' && !profilesQuery.isLoading && Boolean(profilesQuery.error);

  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('');
    setSiteFilter('all');
    setWarehouseFilter('all');
    setZoneFilter('all');
    setAisleFilter('all');
    setRackFilter('all');
    setCreateOpen(false);
    setEditingLocation(null);
  }, [mode]);

  useEffect(() => {
    setCreateZoneId((current) =>
      current && zoneScopeRows.some(({ zone }) => zone.id === current) ? current : (zoneScopeRows[0]?.zone.id ?? ''),
    );
  }, [zoneScopeRows]);

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

  const title = 'Vị trí vật lý';
  const description = 'Quản lý dãy, kệ, tầng và ô của từng vị trí bằng bảng.';
  const canCreate =
    !apiError?.isForbidden &&
    !locationProfileQueryError &&
    zoneScopeRows.length > 0 &&
    locationProfiles.length > 0;

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
      <ComboboxSelect
        id={`${mode}-status-filter`}
        name="statusFilter"
        label="Trạng thái"
        value={statusFilter}
        placeholder="Tất cả"
        optional
        options={[
          { value: '', label: 'Tất cả' },
          { value: 'Active', label: 'Đang hoạt động' },
          { value: 'Inactive', label: 'Không hoạt động' },
          ...(mode === 'locations'
            ? [
                { value: 'Blocked', label: 'Bị khóa' },
                { value: 'Maintenance', label: 'Bảo trì' },
              ]
            : []),
        ]}
        onChange={setStatusFilter}
      />
    </div>
  );

  const toolbar = canCreate ? (
    <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
      Tạo {title.toLocaleLowerCase('vi-VN')}
    </Button>
  ) : null;
  const missingLocationProfiles =
    mode === 'locations' && !profilesQuery.isLoading && !locationProfileQueryError && locationProfiles.length === 0;
  const locationProfileErrorMessage =
    profileApiError?.message ?? 'Không thể tải danh sách hồ sơ vị trí đang hoạt động.';
  const locationEmptyMessage = (() => {
    if (locationProfileQueryError) return locationProfileErrorMessage;
    if (warehouseScopeRows.length === 0 && missingLocationProfiles) {
      return 'Tạo kho, zone và hồ sơ vị trí trước khi thêm vị trí vật lý.';
    }
    if (warehouseScopeRows.length === 0) return 'Tạo kho trước khi thêm zone và vị trí vật lý.';
    if (zoneScopeRows.length === 0 && missingLocationProfiles) {
      return 'Tạo zone và hồ sơ vị trí trước khi thêm vị trí vật lý.';
    }
    if (zoneScopeRows.length === 0) return 'Tạo zone trước khi thêm vị trí vật lý.';
    if (missingLocationProfiles) return 'Tạo hoặc kích hoạt hồ sơ vị trí trước khi thêm vị trí vật lý.';
    if (locationScopeRows.length === 0) {
      return zoneFilter === 'all'
        ? 'Tạo vị trí vật lý đầu tiên cho zone trong phạm vi đang chọn.'
        : 'Tạo vị trí vật lý đầu tiên cho zone đang chọn.';
    }
    return 'Không có vị trí phù hợp với bộ lọc hiện tại.';
  })();
  const missingLocationProfileBanner = missingLocationProfiles ? (
    <Alert role="status" variant="warning">
      <AlertTitle>Thiếu hồ sơ vị trí đang hoạt động</AlertTitle>
      <AlertDescription>
        Tạo hoặc kích hoạt hồ sơ vị trí trước khi thêm vị trí vật lý mới.
      </AlertDescription>
      <AlertAction>
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.FOUNDATION.LOCATION_PROFILES}>Quản lý hồ sơ vị trí</Link>
        </Button>
      </AlertAction>
    </Alert>
  ) : null;
  const locationProfileErrorBanner = locationProfileQueryError ? (
    <Alert role="alert" variant="destructive">
      <AlertTitle>Không thể tải hồ sơ vị trí</AlertTitle>
      <AlertDescription>{locationProfileErrorMessage}</AlertDescription>
      <AlertAction>
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.FOUNDATION.LOCATION_PROFILES}>Mở danh mục hồ sơ vị trí</Link>
        </Button>
      </AlertAction>
    </Alert>
  ) : null;

  return (
    <>
      <ListPageShell
        title={title}
        description={description}
        toolbar={toolbar}
        filters={
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
        }
        state={pageState}
        stateTitle={pageState === 'forbidden' ? 'Không có quyền' : undefined}
        stateMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu cấu trúc vật lý.' : undefined)}
        filtersAriaLabel={`${title} bộ lọc`}
        contentAriaLabel={`${title} danh sách`}
      >
        {locationProfileErrorBanner}
        {missingLocationProfileBanner}
        <LocationTable
          rows={locationTableRows}
          emptyMessage={locationEmptyMessage}
          locationProfiles={locationProfiles}
          onEdit={(location) => setEditingLocation(location.entity)}
        />
      </ListPageShell>

      <CreateModal
        mode={mode}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        zones={zoneScopeRows}
        locationProfiles={locationProfiles}
        createZoneId={createZoneId}
        onCreateZoneId={setCreateZoneId}
        mutations={mutations}
      />

      <FormModal title="Cập nhật vị trí vật lý" open={editingLocation != null} onClose={() => setEditingLocation(null)}>
        {editingLocation ? (
          <LocationForm
            key={editingLocation.id}
            initialValue={locationWithPhysicalFallback(editingLocation)}
            locationProfiles={locationProfiles}
            submitLabel="Cập nhật vị trí"
            pending={mutations.updateLocation.isPending}
            onSubmit={(values, dirtyFields) =>
              mutations.updateLocation.mutate(
                {
                  id: editingLocation.id,
                  input: preserveUnchangedPhysicalFallbacks(values, editingLocation, dirtyFields),
                },
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
  open,
  onClose,
  zones,
  locationProfiles,
  createZoneId,
  onCreateZoneId,
  mutations,
}: {
  mode: PhysicalStructureCatalogMode;
  open: boolean;
  onClose: () => void;
  zones: ZoneRow[];
  locationProfiles: LocationProfile[];
  createZoneId: string;
  onCreateZoneId: (value: string) => void;
  mutations: ReturnType<typeof useMasterDataMutations>;
}) {
  const selectedZone = zones.find(({ zone }) => zone.id === createZoneId)?.zone;

  return (
    <FormModal title="Tạo vị trí vật lý" open={open} onClose={onClose}>
      {selectedZone ? (
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
      )}
    </FormModal>
  );
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

function LocationTable({
  rows,
  emptyMessage,
  locationProfiles,
  onEdit,
}: {
  rows: LocationRow[];
  emptyMessage: string;
  locationProfiles: LocationProfile[];
  onEdit: (location: LocationNode) => void;
}) {
  const profileLabels = new Map(locationProfiles.map((profile) => [profile.id, profile.profileCode]));
  if (rows.length === 0) return <EmptyTableMessage message={emptyMessage} />;

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
              <TableHead>Kệ</TableHead>
              <TableHead>Tầng</TableHead>
              <TableHead>Ô</TableHead>
              <TableHead>Hồ sơ vị trí</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
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
              <dt className="text-muted-foreground">Kệ</dt>
              <dd className="font-medium">{physicalField(row.location.entity, 'rack')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tầng</dt>
              <dd className="font-medium">{physicalField(row.location.entity, 'level')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ô</dt>
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
