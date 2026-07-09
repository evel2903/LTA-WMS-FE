import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertTitle, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useActiveWarehouseTypes } from '@modules/MasterData/Application/Queries/UseWarehouseTypes';
import type { SiteLocationTree, Warehouse } from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { WarehouseForm } from '@modules/MasterData/Presentation/Forms/WarehouseForm';
import { countDescendants, normalized } from '@modules/MasterData/Presentation/Utils/MasterDataTreeUtils';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

type SiteNode = Extract<SiteLocationTree, { type: 'site' }>;
type WarehouseNode = Extract<SiteLocationTree, { type: 'warehouse' }>;

interface SiteRow {
  site: SiteNode;
}

interface WarehouseRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zoneCount: number;
  locationCount: number;
}

function siteRows(nodes: SiteLocationTree[]): SiteRow[] {
  return nodes.filter((node): node is SiteNode => node.type === 'site').map((site) => ({ site }));
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

function filterWarehouseRows(rows: WarehouseRow[], searchTerm: string, statusFilter: string, siteFilter: string): WarehouseRow[] {
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

function compareWarehouseRows(a: WarehouseRow, b: WarehouseRow, column: string): number {
  switch (column) {
    case 'site':
      return a.site.entity.siteCode.localeCompare(b.site.entity.siteCode, 'vi');
    case 'warehouse-code':
      return a.warehouse.entity.warehouseCode.localeCompare(b.warehouse.entity.warehouseCode, 'vi');
    case 'warehouse-name':
      return a.warehouse.entity.warehouseName.localeCompare(b.warehouse.entity.warehouseName, 'vi');
    case 'warehouse-type':
      return a.warehouse.entity.warehouseTypeCode.localeCompare(b.warehouse.entity.warehouseTypeCode, 'vi');
    case 'status':
      return a.warehouse.status.localeCompare(b.warehouse.status, 'vi');
    case 'zone-count':
      return a.zoneCount - b.zoneCount;
    case 'location-count':
      return a.locationCount - b.locationCount;
    default:
      return 0;
  }
}

function sortWarehouseRows(rows: WarehouseRow[], sort: CatalogSortState | null): WarehouseRow[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => compareWarehouseRows(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
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
    <ComboboxSelect
      id="warehouse-create-parent-site"
      name="parentSiteId"
      label="Site"
      value={selectedSiteId}
      placeholder="Chọn site"
      options={sites.map(({ site }) => ({ value: site.id, label: `${site.entity.siteCode} - ${site.entity.siteName}` }))}
      onChange={onChange}
    />
  );
}

export function WarehouseMasterPage() {
  const treeQuery = useSiteLocationTree();
  const warehouseTypesQuery = useActiveWarehouseTypes();
  const mutations = useMasterDataMutations();
  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const sites = useMemo(() => siteRows(nodes), [nodes]);
  const warehouses = useMemo(() => warehouseRows(nodes), [nodes]);
  const warehouseTypes = warehouseTypesQuery.data?.items ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [createSiteId, setCreateSiteId] = useState('');

  const siteScopeRows = useMemo(
    () => (siteFilter === 'all' ? sites : sites.filter(({ site }) => site.id === siteFilter)),
    [siteFilter, sites],
  );
  const warehouseScopeRows = useMemo(
    () => warehouses.filter(({ site }) => siteFilter === 'all' || site.id === siteFilter),
    [siteFilter, warehouses],
  );
  const filteredRows = useMemo(
    () => filterWarehouseRows(warehouses, searchTerm, statusFilter, siteFilter),
    [warehouses, searchTerm, statusFilter, siteFilter],
  );
  const sortedRows = useMemo(() => sortWarehouseRows(filteredRows, sort), [filteredRows, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (createOpen) return;
    setCreateSiteId((current) =>
      current && siteScopeRows.some(({ site }) => site.id === current) ? current : (siteScopeRows[0]?.site.id ?? ''),
    );
  }, [siteScopeRows, createOpen]);

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
  const canCreate = !apiError?.isForbidden && siteScopeRows.length > 0;

  const columns: CatalogColumn<WarehouseRow>[] = [
    { id: 'site', header: 'Site', render: (row) => row.site.entity.siteCode, sortable: true },
    { id: 'warehouse-code', header: 'Mã kho', render: (row) => row.warehouse.entity.warehouseCode, sortable: true },
    { id: 'warehouse-name', header: 'Tên kho', render: (row) => row.warehouse.entity.warehouseName, sortable: true },
    { id: 'warehouse-type', header: 'Loại kho', render: (row) => row.warehouse.entity.warehouseTypeCode, sortable: true },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.warehouse.status} />,
      sortable: true,
    },
    { id: 'zone-count', header: 'Zone', render: (row) => row.zoneCount, className: 'text-right', sortable: true },
    { id: 'location-count', header: 'Vị trí', render: (row) => row.locationCount, className: 'text-right', sortable: true },
    {
      header: 'Hành động',
      render: (row) => (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditingWarehouse(row.warehouse.entity)}>
          Sửa
        </Button>
      ),
      className: 'text-right',
    },
  ];

  const warehouseEmptyMessage =
    sites.length === 0
      ? 'Tạo site trước khi thêm kho.'
      : warehouseScopeRows.length === 0
        ? siteFilter === 'all'
          ? 'Tạo kho đầu tiên cho site đã có.'
          : 'Tạo kho đầu tiên cho site đang chọn.'
        : 'Không có kho phù hợp với bộ lọc hiện tại.';

  return (
    <>
      <CatalogListView
        title="Kho"
        description="Quản lý danh sách kho theo bảng."
        state={state}
        columns={columns}
        rows={pagedRows}
        rowKey={(row) => row.warehouse.id}
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
        emptyLabel={warehouseEmptyMessage}
        errorMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu kho.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo kho
            </Button>
          ) : null
        }
        toolbar={
          <div className="grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_200px] md:items-end">
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
                id="warehouse-status-filter"
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
            <div className="grid min-w-0 gap-3 md:w-1/2 md:items-end">
              <ComboboxSelect
                id="warehouse-site-filter"
                name="siteFilter"
                label="Site"
                value={siteFilter === 'all' ? '' : siteFilter}
                placeholder="Tất cả site"
                optional
                options={[
                  { value: '', label: 'Tất cả site' },
                  ...sites.map(({ site }) => ({
                    value: site.id,
                    label: `${site.entity.siteCode} - ${site.entity.siteName}`,
                  })),
                ]}
                onChange={(value) => {
                  setSiteFilter(value === '' ? 'all' : value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
      />

      <FormModal
        title="Tạo kho"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      >
        {sites.length > 0 ? (
          <div className="grid gap-4">
            <ParentSiteSelect sites={siteScopeRows} selectedSiteId={createSiteId} onChange={setCreateSiteId} />
            <WarehouseForm
              key={createSiteId}
              siteId={createSiteId}
              warehouseTypes={warehouseTypes}
              submitLabel="Tạo kho"
              pending={mutations.createWarehouse.isPending}
              onSubmit={(values) => mutations.createWarehouse.mutate(values, { onSuccess: () => setCreateOpen(false) })}
            />
          </div>
        ) : (
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có site</AlertTitle>
            <AlertDescription>Tạo site trước khi tạo kho.</AlertDescription>
          </Alert>
        )}
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
    </>
  );
}
