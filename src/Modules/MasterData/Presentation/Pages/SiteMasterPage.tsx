import { useMemo, useState } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import type { Site, SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { countDescendants, normalized } from '@modules/MasterData/Presentation/Utils/MasterDataTreeUtils';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

type SiteNode = Extract<SiteLocationTree, { type: 'site' }>;

interface SiteRow {
  site: SiteNode;
  warehouseCount: number;
  zoneCount: number;
  locationCount: number;
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

function filterSiteRows(rows: SiteRow[], searchTerm: string, statusFilter: string): SiteRow[] {
  const search = normalized(searchTerm);
  return rows.filter(({ site }) => {
    const searchSource = `${site.entity.siteCode} ${site.entity.siteName}`.toLocaleLowerCase('vi-VN');
    return (!search || searchSource.includes(search)) && (!statusFilter || site.status === statusFilter);
  });
}

function compareSiteRows(a: SiteRow, b: SiteRow, column: string): number {
  switch (column) {
    case 'site-code':
      return a.site.entity.siteCode.localeCompare(b.site.entity.siteCode, 'vi');
    case 'site-name':
      return a.site.entity.siteName.localeCompare(b.site.entity.siteName, 'vi');
    case 'status':
      return a.site.status.localeCompare(b.site.status, 'vi');
    case 'warehouse-count':
      return a.warehouseCount - b.warehouseCount;
    case 'zone-count':
      return a.zoneCount - b.zoneCount;
    case 'location-count':
      return a.locationCount - b.locationCount;
    default:
      return 0;
  }
}

function sortSiteRows(rows: SiteRow[], sort: CatalogSortState | null): SiteRow[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => compareSiteRows(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function SiteMasterPage() {
  const treeQuery = useSiteLocationTree();
  const mutations = useMasterDataMutations();
  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const sites = useMemo(() => siteRows(nodes), [nodes]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const filteredRows = useMemo(
    () => filterSiteRows(sites, searchTerm, statusFilter),
    [sites, searchTerm, statusFilter],
  );
  const sortedRows = useMemo(() => sortSiteRows(filteredRows, sort), [filteredRows, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

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
  const canCreate = !apiError?.isForbidden;

  const columns: CatalogColumn<SiteRow>[] = [
    { id: 'site-code', header: 'Mã site', render: (row) => row.site.entity.siteCode, sortable: true },
    { id: 'site-name', header: 'Tên site', render: (row) => row.site.entity.siteName, sortable: true },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.site.status} />,
      sortable: true,
    },
    { id: 'warehouse-count', header: 'Kho', render: (row) => row.warehouseCount, className: 'text-right', sortable: true },
    { id: 'zone-count', header: 'Zone', render: (row) => row.zoneCount, className: 'text-right', sortable: true },
    { id: 'location-count', header: 'Vị trí', render: (row) => row.locationCount, className: 'text-right', sortable: true },
    {
      header: 'Hành động',
      render: (row) => (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditingSite(row.site.entity)}>
          Sửa
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <>
      <CatalogListView
        title="Site"
        description="Quản lý site bằng bảng trước khi cấu hình kho và sơ đồ."
        state={state}
        columns={columns}
        rows={pagedRows}
        rowKey={(row) => row.site.id}
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
        emptyLabel={
          sites.length === 0
            ? 'Tạo site đầu tiên trước khi thêm kho, zone và vị trí vật lý.'
            : 'Không có site phù hợp với bộ lọc hiện tại.'
        }
        errorMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu site.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo site
            </Button>
          ) : null
        }
        toolbar={
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
              id="site-status-filter"
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
        }
      />

      <FormModal title="Tạo site" open={createOpen} onClose={() => setCreateOpen(false)}>
        <SiteForm
          submitLabel="Tạo site"
          pending={mutations.createSite.isPending}
          onSubmit={(values) => mutations.createSite.mutate(values, { onSuccess: () => setCreateOpen(false) })}
        />
      </FormModal>
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
    </>
  );
}
