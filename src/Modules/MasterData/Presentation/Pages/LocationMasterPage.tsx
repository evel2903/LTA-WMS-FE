import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import type { Location, LocationProfile, SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import {
  explicitPhysicalField,
  fallbackPhysicalField,
  locationWithPhysicalFallback,
  physicalFieldDisplay,
  physicalFilterValue,
} from '@modules/MasterData/Presentation/Components/PhysicalAddressFallback';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { LocationForm, type LocationFormDirtyFields } from '@modules/MasterData/Presentation/Forms/LocationForm';
import {
  LOCATION_STATUS_OPTIONS,
  type LocationFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';
import {
  normalized,
  type SiteNode,
  type WarehouseNode,
  type ZoneNode,
  type LocationNode,
} from '@modules/MasterData/Presentation/Utils/MasterDataTreeUtils';

const physicalFormFields = [
  { field: 'aisleCode', part: 'aisle' },
  { field: 'rackCode', part: 'rack' },
  { field: 'levelCode', part: 'level' },
  { field: 'binCode', part: 'bin' },
] as const satisfies ReadonlyArray<{
  field: keyof Pick<LocationFormValues, 'aisleCode' | 'rackCode' | 'levelCode' | 'binCode'>;
  part: 'aisle' | 'rack' | 'level' | 'bin';
}>;

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

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

interface ZoneOption {
  site: SiteNode;
  warehouse: WarehouseNode;
  zone: ZoneNode;
}

interface LocationRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zone: ZoneNode;
  location: LocationNode;
}

function siteOptions(nodes: SiteLocationTree[]): SiteNode[] {
  return nodes.filter((node): node is SiteNode => node.type === 'site');
}

function warehouseOptions(nodes: SiteLocationTree[]): { site: SiteNode; warehouse: WarehouseNode }[] {
  return siteOptions(nodes).flatMap((site) =>
    site.children
      .filter((child): child is WarehouseNode => child.type === 'warehouse')
      .map((warehouse) => ({ site, warehouse })),
  );
}

function zoneOptions(nodes: SiteLocationTree[]): ZoneOption[] {
  return warehouseOptions(nodes).flatMap(({ site, warehouse }) =>
    warehouse.children
      .filter((child): child is ZoneNode => child.type === 'zone')
      .map((zone) => ({ site, warehouse, zone })),
  );
}

// Locations can nest (pallet positions within a bin, etc.) — walk the whole subtree,
// not just direct children, so nested locations still show up as flat rows.
function collectLocationNodes(node: SiteLocationTree): LocationNode[] {
  return node.children.flatMap((child) => {
    const own = child.type === 'location' ? [child] : [];
    return [...own, ...collectLocationNodes(child)];
  });
}

function locationRows(nodes: SiteLocationTree[]): LocationRow[] {
  return zoneOptions(nodes).flatMap(({ site, warehouse, zone }) =>
    collectLocationNodes(zone).map((location) => ({ site, warehouse, zone, location })),
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
    const searchSource = [
      site.entity.siteCode,
      warehouse.entity.warehouseCode,
      zone.entity.zoneCode,
      location.entity.locationCode,
      location.entity.locationName,
      aisle,
      rack,
      physicalFilterValue(location.entity, 'level'),
      physicalFilterValue(location.entity, 'bin'),
    ]
      .join(' ')
      .toLocaleLowerCase('vi-VN');
    return (
      (!search || searchSource.includes(search)) &&
      (!statusFilter || location.status === statusFilter) &&
      (!siteFilter || site.id === siteFilter) &&
      (!warehouseFilter || warehouse.id === warehouseFilter) &&
      (!zoneFilter || zone.id === zoneFilter) &&
      (!aisleFilter || aisle === aisleFilter) &&
      (!rackFilter || rack === rackFilter)
    );
  });
}

function compareLocationRows(a: LocationRow, b: LocationRow, column: string, profileLabels: Map<string, string>): number {
  switch (column) {
    case 'warehouse-code':
      return a.warehouse.entity.warehouseCode.localeCompare(b.warehouse.entity.warehouseCode, 'vi');
    case 'zone-code':
      return a.zone.entity.zoneCode.localeCompare(b.zone.entity.zoneCode, 'vi');
    case 'location-code':
      return a.location.entity.locationCode.localeCompare(b.location.entity.locationCode, 'vi');
    case 'location-type':
      return a.location.entity.locationType.localeCompare(b.location.entity.locationType, 'vi');
    case 'aisle':
      return physicalFilterValue(a.location.entity, 'aisle').localeCompare(physicalFilterValue(b.location.entity, 'aisle'), 'vi', { numeric: true });
    case 'rack':
      return physicalFilterValue(a.location.entity, 'rack').localeCompare(physicalFilterValue(b.location.entity, 'rack'), 'vi', { numeric: true });
    case 'level':
      return physicalFilterValue(a.location.entity, 'level').localeCompare(physicalFilterValue(b.location.entity, 'level'), 'vi', { numeric: true });
    case 'bin':
      return physicalFilterValue(a.location.entity, 'bin').localeCompare(physicalFilterValue(b.location.entity, 'bin'), 'vi', { numeric: true });
    case 'location-profile':
      return (profileLabels.get(a.location.entity.locationProfileId) ?? '').localeCompare(
        profileLabels.get(b.location.entity.locationProfileId) ?? '',
        'vi',
      );
    case 'status':
      return a.location.status.localeCompare(b.location.status, 'vi');
    default:
      return 0;
  }
}

function sortLocationRows(rows: LocationRow[], sort: CatalogSortState | null, profileLabels: Map<string, string>): LocationRow[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => compareLocationRows(a, b, sort.column, profileLabels));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function LocationMasterPage() {
  const treeQuery = useSiteLocationTree();
  const profilesQuery = useLocationProfiles({ status: 'Active' });
  const mutations = useMasterDataMutations();
  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const profileApiError = profilesQuery.error instanceof ApiError ? profilesQuery.error : null;
  const locationProfiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const profileLabels = useMemo(
    () => new Map(locationProfiles.map((profile: LocationProfile) => [profile.id, profile.profileCode])),
    [locationProfiles],
  );
  const rows = useMemo(() => locationRows(nodes), [nodes]);
  const zones = useMemo(() => zoneOptions(nodes), [nodes]);
  const sites = useMemo(() => siteOptions(nodes), [nodes]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [aisleFilter, setAisleFilter] = useState('');
  const [rackFilter, setRackFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createZoneId, setCreateZoneId] = useState('');
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Every level below cascades from the one above; each level self-heals (falls back
  // to "all" the moment its raw value is no longer valid) instead of silently matching
  // zero rows or pointing at a stale id — the exact gap DSR-03's review found and fixed
  // after the fact, applied here from the start.
  const scopedWarehouses = useMemo(
    () => zones.filter(({ site }) => !siteFilter || site.id === siteFilter),
    [siteFilter, zones],
  );
  const warehouseChoices = useMemo(() => {
    const seen = new Map<string, { site: SiteNode; warehouse: WarehouseNode }>();
    scopedWarehouses.forEach(({ site, warehouse }) => seen.set(warehouse.id, { site, warehouse }));
    return [...seen.values()];
  }, [scopedWarehouses]);
  const activeWarehouseFilter = warehouseChoices.some(({ warehouse }) => warehouse.id === warehouseFilter)
    ? warehouseFilter
    : '';
  const scopedZones = useMemo(
    () =>
      zones.filter(
        ({ site, warehouse }) =>
          (!siteFilter || site.id === siteFilter) && (!activeWarehouseFilter || warehouse.id === activeWarehouseFilter),
      ),
    [siteFilter, activeWarehouseFilter, zones],
  );
  const activeZoneFilter = scopedZones.some(({ zone }) => zone.id === zoneFilter) ? zoneFilter : '';
  const scopedRowsForOptions = useMemo(
    () =>
      rows.filter(
        ({ site, warehouse, zone }) =>
          (!siteFilter || site.id === siteFilter) &&
          (!activeWarehouseFilter || warehouse.id === activeWarehouseFilter) &&
          (!activeZoneFilter || zone.id === activeZoneFilter),
      ),
    [rows, siteFilter, activeWarehouseFilter, activeZoneFilter],
  );
  const aisleOptions = useMemo(
    () => Array.from(new Set(scopedRowsForOptions.map(({ location }) => physicalFilterValue(location.entity, 'aisle')).filter(Boolean))).sort(),
    [scopedRowsForOptions],
  );
  const activeAisleFilter = aisleOptions.includes(aisleFilter) ? aisleFilter : '';
  // Kệ (rack) is the level below Dãy (aisle) in the cascade, so its options must be scoped
  // by the active aisle too — otherwise a rack that only exists under a different aisle
  // stays selectable and never self-heals once combined with the current aisle filter.
  const scopedRowsForRackOptions = useMemo(
    () =>
      scopedRowsForOptions.filter(
        ({ location }) => !activeAisleFilter || physicalFilterValue(location.entity, 'aisle') === activeAisleFilter,
      ),
    [scopedRowsForOptions, activeAisleFilter],
  );
  const rackOptions = useMemo(
    () => Array.from(new Set(scopedRowsForRackOptions.map(({ location }) => physicalFilterValue(location.entity, 'rack')).filter(Boolean))).sort(),
    [scopedRowsForRackOptions],
  );
  const activeRackFilter = rackOptions.includes(rackFilter) ? rackFilter : '';

  const filteredRows = useMemo(
    () =>
      filterLocationRows(
        rows,
        searchTerm,
        statusFilter,
        siteFilter,
        activeWarehouseFilter,
        activeZoneFilter,
        activeAisleFilter,
        activeRackFilter,
      ),
    [rows, searchTerm, statusFilter, siteFilter, activeWarehouseFilter, activeZoneFilter, activeAisleFilter, activeRackFilter],
  );
  const sortedRows = useMemo(() => sortLocationRows(filteredRows, sort, profileLabels), [filteredRows, sort, profileLabels]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  // Create-zone picker for the "Tạo vị trí" dialog is scoped the same way the toolbar's
  // Zone filter (scopedZones) is, and defaults to whatever the toolbar is currently scoped to.
  const activeCreateZoneId =
    createZoneId && scopedZones.some(({ zone }) => zone.id === createZoneId)
      ? createZoneId
      : (activeZoneFilter || scopedZones[0]?.zone.id || '');
  const selectedCreateZone = scopedZones.find(({ zone }) => zone.id === activeCreateZoneId);

  function handleSiteFilterChange(value: string) {
    setSiteFilter(value);
    setWarehouseFilter('');
    setZoneFilter('');
    setAisleFilter('');
    setRackFilter('');
    setPage(1);
  }

  function handleWarehouseFilterChange(value: string) {
    setWarehouseFilter(value);
    setZoneFilter('');
    setAisleFilter('');
    setRackFilter('');
    setPage(1);
  }

  function handleZoneFilterChange(value: string) {
    setZoneFilter(value);
    setAisleFilter('');
    setRackFilter('');
    setPage(1);
  }

  function handleSortChange(column: string) {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
    setPage(1);
  }

  const profileQueryError = !profilesQuery.isLoading && Boolean(profilesQuery.error);
  const missingProfiles = !profilesQuery.isLoading && !profileQueryError && locationProfiles.length === 0;

  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : treeQuery.isLoading
      ? 'loading'
      : treeQuery.error
        ? 'error'
        : filteredRows.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden && !profileQueryError && !missingProfiles && scopedZones.length > 0;

  const columns: CatalogColumn<LocationRow>[] = [
    { id: 'warehouse-code', header: 'Kho', render: (row) => row.warehouse.entity.warehouseCode, sortable: true },
    { id: 'zone-code', header: 'Zone', render: (row) => row.zone.entity.zoneCode, sortable: true },
    {
      id: 'location-code',
      header: 'Mã vị trí',
      render: (row) => (
        <>
          <div className="font-medium">{row.location.entity.locationCode}</div>
          <div className="text-muted-foreground text-xs">{row.location.entity.locationName}</div>
        </>
      ),
      sortable: true,
    },
    { id: 'location-type', header: 'Loại', render: (row) => row.location.entity.locationType, sortable: true },
    { id: 'aisle', header: 'Dãy', render: (row) => physicalFieldDisplay(row.location.entity, 'aisle'), sortable: true },
    { id: 'rack', header: 'Kệ', render: (row) => physicalFieldDisplay(row.location.entity, 'rack'), sortable: true },
    { id: 'level', header: 'Tầng', render: (row) => physicalFieldDisplay(row.location.entity, 'level'), sortable: true },
    { id: 'bin', header: 'Ô', render: (row) => physicalFieldDisplay(row.location.entity, 'bin'), sortable: true },
    {
      id: 'location-profile',
      header: 'Hồ sơ vị trí',
      render: (row) => profileLabels.get(row.location.entity.locationProfileId) ?? row.location.entity.locationProfileId,
      sortable: true,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.location.status} />,
      sortable: true,
    },
    {
      header: 'Hành động',
      render: (row) => (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditingLocation(row.location.entity)}>
          Sửa
        </Button>
      ),
      className: 'text-right',
    },
  ];

  const emptyLabel = missingProfiles
    ? 'Tạo hoặc kích hoạt hồ sơ vị trí trước khi thêm vị trí vật lý.'
    : scopedZones.length === 0
      ? 'Tạo zone trước khi thêm vị trí vật lý.'
      : 'Không có vị trí phù hợp với bộ lọc hiện tại.';

  return (
    <>
      <CatalogListView
        title="Vị trí vật lý"
        description="Quản lý dãy, kệ, tầng và ô của từng vị trí bằng bảng."
        state={state}
        columns={columns}
        rows={pagedRows}
        rowKey={(row) => row.location.id}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        sort={sort}
        onSortChange={handleSortChange}
        canCreate={canCreate}
        emptyLabel={emptyLabel}
        errorMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu vị trí vật lý.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo vị trí vật lý
            </Button>
          ) : null
        }
        toolbar={
          <div className="grid min-w-0 gap-3">
            {missingProfiles ? (
              <Alert role="status" variant="warning">
                <AlertTitle>Thiếu hồ sơ vị trí đang hoạt động</AlertTitle>
                <AlertDescription>Tạo hoặc kích hoạt hồ sơ vị trí trước khi thêm vị trí vật lý mới.</AlertDescription>
                <AlertAction>
                  <Button asChild size="sm" variant="outline">
                    <Link to={ROUTES.FOUNDATION.LOCATION_PROFILES}>Quản lý hồ sơ vị trí</Link>
                  </Button>
                </AlertAction>
              </Alert>
            ) : null}
            {profileQueryError ? (
              <Alert role="alert" variant="destructive">
                <AlertTitle>Không thể tải hồ sơ vị trí</AlertTitle>
                <AlertDescription>
                  {profileApiError?.message ?? 'Không thể tải danh sách hồ sơ vị trí đang hoạt động.'}
                </AlertDescription>
                <AlertAction>
                  <Button asChild size="sm" variant="outline">
                    <Link to={ROUTES.FOUNDATION.LOCATION_PROFILES}>Mở danh mục hồ sơ vị trí</Link>
                  </Button>
                </AlertAction>
              </Alert>
            ) : null}
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
              <label className="grid min-w-0 gap-1 text-sm">
                Tìm
                <Input
                  className="min-w-0"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Mã hoặc tên"
                />
              </label>
              <ComboboxSelect
                id="location-status-filter"
                name="statusFilter"
                label="Trạng thái"
                value={statusFilter}
                placeholder="Tất cả"
                optional
                options={[{ value: '', label: 'Tất cả' }, ...LOCATION_STATUS_OPTIONS]}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <ComboboxSelect
                id="location-site-filter"
                name="siteFilter"
                label="Site"
                value={siteFilter}
                placeholder="Tất cả site"
                optional
                options={[
                  { value: '', label: 'Tất cả site' },
                  ...sites.map((site) => ({ value: site.id, label: `${site.entity.siteCode} - ${site.entity.siteName}` })),
                ]}
                onChange={handleSiteFilterChange}
              />
              <ComboboxSelect
                id="location-warehouse-filter"
                name="warehouseFilter"
                label="Kho"
                value={activeWarehouseFilter}
                placeholder="Tất cả kho"
                optional
                options={[
                  { value: '', label: 'Tất cả kho' },
                  ...warehouseChoices.map(({ warehouse }) => ({
                    value: warehouse.id,
                    label: `${warehouse.entity.warehouseCode} - ${warehouse.entity.warehouseName}`,
                  })),
                ]}
                onChange={handleWarehouseFilterChange}
              />
              <ComboboxSelect
                id="location-zone-filter"
                name="zoneFilter"
                label="Zone"
                value={activeZoneFilter}
                placeholder="Tất cả zone"
                optional
                options={[
                  { value: '', label: 'Tất cả zone' },
                  ...scopedZones.map(({ warehouse, zone }) => ({
                    value: zone.id,
                    label: `${warehouse.entity.warehouseCode} · ${zone.entity.zoneCode}`,
                  })),
                ]}
                onChange={handleZoneFilterChange}
              />
              <ComboboxSelect
                id="location-aisle-filter"
                name="aisleFilter"
                label="Dãy"
                value={activeAisleFilter}
                placeholder="Tất cả"
                optional
                options={[{ value: '', label: 'Tất cả' }, ...aisleOptions.map((aisle) => ({ value: aisle, label: aisle }))]}
                onChange={(value) => {
                  setAisleFilter(value);
                  setRackFilter('');
                  setPage(1);
                }}
              />
              <ComboboxSelect
                id="location-rack-filter"
                name="rackFilter"
                label="Kệ"
                value={activeRackFilter}
                placeholder="Tất cả"
                optional
                options={[{ value: '', label: 'Tất cả' }, ...rackOptions.map((rack) => ({ value: rack, label: rack }))]}
                onChange={(value) => {
                  setRackFilter(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
      />

      <FormModal title="Tạo vị trí vật lý" open={createOpen} onClose={() => setCreateOpen(false)}>
        {selectedCreateZone ? (
          <div className="grid gap-4">
            <ComboboxSelect
              id="location-create-zone"
              name="zoneId"
              label="Zone"
              value={activeCreateZoneId}
              placeholder="Chọn zone"
              options={scopedZones.map(({ warehouse, zone }) => ({
                value: zone.id,
                label: `${warehouse.entity.warehouseCode} · ${zone.entity.zoneCode} - ${zone.entity.zoneName}`,
              }))}
              onChange={setCreateZoneId}
            />
            <LocationForm
              key={activeCreateZoneId}
              warehouseId={selectedCreateZone.warehouse.id}
              zoneId={selectedCreateZone.zone.id}
              locationProfiles={locationProfiles}
              submitLabel="Tạo vị trí"
              pending={mutations.createLocation.isPending}
              onSubmit={(values) => mutations.createLocation.mutate(values, { onSuccess: () => setCreateOpen(false) })}
            />
          </div>
        ) : (
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có zone phù hợp</AlertTitle>
            <AlertDescription>Xóa bộ lọc Site/Kho hoặc tạo zone trước khi tạo vị trí vật lý.</AlertDescription>
          </Alert>
        )}
      </FormModal>
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
