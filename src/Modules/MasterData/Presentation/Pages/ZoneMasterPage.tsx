import { useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import type { SiteLocationTree, Zone } from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { ZoneForm } from '@modules/MasterData/Presentation/Forms/ZoneForm';
import {
  countDescendants,
  normalized,
  type SiteNode,
  type WarehouseNode,
  type ZoneNode,
} from '@modules/MasterData/Presentation/Utils/MasterDataTreeUtils';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

interface WarehouseOption {
  site: SiteNode;
  warehouse: WarehouseNode;
}

interface ZoneRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zone: ZoneNode;
  locationCount: number;
}

function siteOptions(nodes: SiteLocationTree[]): SiteNode[] {
  return nodes.filter((node): node is SiteNode => node.type === 'site');
}

function warehouseOptions(nodes: SiteLocationTree[]): WarehouseOption[] {
  return siteOptions(nodes).flatMap((site) =>
    site.children
      .filter((child): child is WarehouseNode => child.type === 'warehouse')
      .map((warehouse) => ({ site, warehouse })),
  );
}

function zoneRows(nodes: SiteLocationTree[]): ZoneRow[] {
  return warehouseOptions(nodes).flatMap(({ site, warehouse }) =>
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

function filterZoneRows(
  rows: ZoneRow[],
  searchTerm: string,
  statusFilter: string,
  siteFilter: string,
  warehouseFilter: string,
): ZoneRow[] {
  const search = normalized(searchTerm);
  return rows.filter(({ site, warehouse, zone }) => {
    const searchSource =
      `${site.entity.siteCode} ${warehouse.entity.warehouseCode} ${zone.entity.zoneCode} ${zone.entity.zoneName}`.toLocaleLowerCase(
        'vi-VN',
      );
    return (
      (!search || searchSource.includes(search)) &&
      (!statusFilter || zone.status === statusFilter) &&
      (!siteFilter || site.id === siteFilter) &&
      (!warehouseFilter || warehouse.id === warehouseFilter)
    );
  });
}

function compareZoneRows(a: ZoneRow, b: ZoneRow, column: string): number {
  switch (column) {
    case 'site-code':
      return a.site.entity.siteCode.localeCompare(b.site.entity.siteCode, 'vi');
    case 'warehouse-code':
      return a.warehouse.entity.warehouseCode.localeCompare(b.warehouse.entity.warehouseCode, 'vi');
    case 'zone-code':
      return a.zone.entity.zoneCode.localeCompare(b.zone.entity.zoneCode, 'vi');
    case 'zone-name':
      return a.zone.entity.zoneName.localeCompare(b.zone.entity.zoneName, 'vi');
    case 'zone-type':
      return a.zone.entity.zoneType.localeCompare(b.zone.entity.zoneType, 'vi');
    case 'status':
      return a.zone.status.localeCompare(b.zone.status, 'vi');
    case 'location-count':
      return a.locationCount - b.locationCount;
    default:
      return 0;
  }
}

function sortZoneRows(rows: ZoneRow[], sort: CatalogSortState | null): ZoneRow[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => compareZoneRows(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function ZoneMasterPage() {
  const treeQuery = useSiteLocationTree();
  const mutations = useMasterDataMutations();
  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const zones = useMemo(() => zoneRows(nodes), [nodes]);
  const warehouses = useMemo(() => warehouseOptions(nodes), [nodes]);
  const sites = useMemo(() => siteOptions(nodes), [nodes]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createWarehouseId, setCreateWarehouseId] = useState('');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  const scopedWarehouses = useMemo(
    () => warehouses.filter(({ site }) => !siteFilter || site.id === siteFilter),
    [siteFilter, warehouses],
  );
  // Self-heals if the selected warehouse falls out of scope (site filter changed, or the
  // warehouse itself disappeared from a refetch) instead of silently matching zero rows.
  const activeWarehouseFilter = scopedWarehouses.some(({ warehouse }) => warehouse.id === warehouseFilter)
    ? warehouseFilter
    : '';
  const filteredRows = useMemo(
    () => filterZoneRows(zones, searchTerm, statusFilter, siteFilter, activeWarehouseFilter),
    [zones, searchTerm, statusFilter, siteFilter, activeWarehouseFilter],
  );
  const sortedRows = useMemo(() => sortZoneRows(filteredRows, sort), [filteredRows, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  // Defaults to whatever the toolbar is currently scoped to (warehouse filter, else site
  // filter) instead of the very first warehouse overall, so "Tạo zone" starts in-context.
  const activeCreateWarehouseId =
    createWarehouseId && scopedWarehouses.some(({ warehouse }) => warehouse.id === createWarehouseId)
      ? createWarehouseId
      : (activeWarehouseFilter || scopedWarehouses[0]?.warehouse.id || '');

  function handleSiteFilterChange(value: string) {
    setSiteFilter(value);
    setWarehouseFilter('');
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

  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : treeQuery.isLoading
      ? 'loading'
      : treeQuery.error
        ? 'error'
        : filteredRows.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden && scopedWarehouses.length > 0;

  const columns: CatalogColumn<ZoneRow>[] = [
    { id: 'site-code', header: 'Site', render: (row) => row.site.entity.siteCode, sortable: true },
    { id: 'warehouse-code', header: 'Kho', render: (row) => row.warehouse.entity.warehouseCode, sortable: true },
    { id: 'zone-code', header: 'Mã zone', render: (row) => row.zone.entity.zoneCode, sortable: true },
    { id: 'zone-name', header: 'Tên zone', render: (row) => row.zone.entity.zoneName, sortable: true },
    { id: 'zone-type', header: 'Loại', render: (row) => row.zone.entity.zoneType, sortable: true },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.zone.status} />,
      sortable: true,
    },
    {
      id: 'location-count',
      header: 'Vị trí',
      render: (row) => row.locationCount,
      className: 'text-right',
      sortable: true,
    },
    {
      header: 'Hành động',
      render: (row) => (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditingZone(row.zone.entity)}>
          Sửa
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <>
      <CatalogListView
        title="Zone"
        description="Quản lý zone theo kho bằng bảng; sơ đồ hóa zone làm ở sơ đồ 2D kho."
        state={state}
        columns={columns}
        rows={pagedRows}
        rowKey={(row) => row.zone.id}
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
        emptyLabel={scopedWarehouses.length === 0 ? 'Tạo kho trước khi thêm zone.' : 'Không có zone phù hợp với bộ lọc hiện tại.'}
        errorMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu zone.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo zone
            </Button>
          ) : null
        }
        toolbar={
          <div className="grid min-w-0 gap-3">
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
                id="zone-status-filter"
                name="statusFilter"
                label="Trạng thái"
                value={statusFilter}
                placeholder="Tất cả"
                optional
                options={[
                  { value: '', label: 'Tất cả' },
                  { value: 'Active', label: 'Đang hoạt động' },
                  { value: 'Inactive', label: 'Không hoạt động' },
                ]}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <ComboboxSelect
                id="zone-site-filter"
                name="siteFilter"
                label="Site"
                value={siteFilter}
                placeholder="Tất cả site"
                optional
                options={[
                  { value: '', label: 'Tất cả site' },
                  ...sites.map((site) => ({
                    value: site.id,
                    label: `${site.entity.siteCode} - ${site.entity.siteName}`,
                  })),
                ]}
                onChange={handleSiteFilterChange}
              />
              <ComboboxSelect
                id="zone-warehouse-filter"
                name="warehouseFilter"
                label="Kho"
                value={activeWarehouseFilter}
                placeholder="Tất cả kho"
                optional
                options={[
                  { value: '', label: 'Tất cả kho' },
                  ...scopedWarehouses.map(({ warehouse }) => ({
                    value: warehouse.id,
                    label: `${warehouse.entity.warehouseCode} - ${warehouse.entity.warehouseName}`,
                  })),
                ]}
                onChange={(value) => {
                  setWarehouseFilter(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
      />

      <FormModal title="Tạo zone" open={createOpen} onClose={() => setCreateOpen(false)}>
        {scopedWarehouses.length > 0 ? (
          <div className="grid gap-4">
            <ComboboxSelect
              id="zone-create-warehouse"
              name="warehouseId"
              label="Kho"
              value={activeCreateWarehouseId}
              placeholder="Chọn kho"
              options={scopedWarehouses.map(({ warehouse }) => ({
                value: warehouse.id,
                label: `${warehouse.entity.warehouseCode} - ${warehouse.entity.warehouseName}`,
              }))}
              onChange={setCreateWarehouseId}
            />
            <ZoneForm
              key={activeCreateWarehouseId}
              warehouseId={activeCreateWarehouseId}
              submitLabel="Tạo zone"
              pending={mutations.createZone.isPending}
              onSubmit={(values) => mutations.createZone.mutate(values, { onSuccess: () => setCreateOpen(false) })}
            />
          </div>
        ) : (
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có kho phù hợp</AlertTitle>
            <AlertDescription>Xóa bộ lọc Site/Kho hoặc tạo kho trước khi tạo zone.</AlertDescription>
          </Alert>
        )}
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
    </>
  );
}
