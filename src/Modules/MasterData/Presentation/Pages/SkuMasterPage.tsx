import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useActiveOwners, useSkus } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { SKU_STATUSES } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import {
  MASTER_DATA_EMPTY_LABELS,
  displaySkuStatus,
} from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import type { Sku, SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  ...SKU_STATUSES.map((value) => ({ value, label: displaySkuStatus(value) })),
];

function compareSkus(a: Sku, b: Sku, column: string): number {
  switch (column) {
    case 'code':
      return a.skuCode.localeCompare(b.skuCode, 'vi', { numeric: true });
    case 'name':
      return a.skuName.localeCompare(b.skuName, 'vi');
    case 'class':
      return (a.itemClass ?? '').localeCompare(b.itemClass ?? '', 'vi');
    case 'status':
      return a.itemStatus.localeCompare(b.itemStatus, 'vi');
    default:
      return 0;
  }
}

// Sort is client-side and scoped to the current server page only (server
// pagination is kept as-is; the BE has no sort param), matching DSR-05/Loại kho.
function sortSkus(items: Sku[], sort: CatalogSortState | null): Sku[] {
  if (!sort) return items;
  const sorted = [...items].sort((a, b) => compareSkus(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function SkuMasterPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(MASTER_DATA_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [itemStatus, setItemStatus] = useState<SkuStatus | ''>('');
  const [defaultOwnerId, setDefaultOwnerId] = useState('');
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const skuCode = useDebouncedValue(search);

  const query = useSkus({
    page,
    pageSize,
    skuCode: skuCode || undefined,
    itemStatus: itemStatus || undefined,
    defaultOwnerId: defaultOwnerId || undefined,
  });
  const ownersQuery = useActiveOwners();

  const skus = useMemo(() => query.data?.items ?? [], [query.data]);
  const owners = ownersQuery.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const canCreate = !apiError?.isForbidden;
  const sortedSkus = useMemo(() => sortSkus(skus, sort), [skus, sort]);
  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : skus.length === 0
          ? 'empty'
          : 'ready';

  function handleSortChange(column: string) {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }

  const columns: CatalogColumn<Sku>[] = [
    {
      id: 'code',
      header: 'Mã',
      render: (sku) => <span className="font-medium">{sku.skuCode}</span>,
      sortable: true,
    },
    { id: 'name', header: 'Tên', render: (sku) => sku.skuName, sortable: true },
    { id: 'class', header: 'Nhóm', render: (sku) => sku.itemClass, sortable: true },
    { id: 'status', header: 'Trạng thái', render: (sku) => <SkuStatusBadge status={sku.itemStatus} />, sortable: true },
    {
      header: 'Hành động',
      render: (sku) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(sku.id))}
        >
          Xem
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <CatalogListView
      title="SKU"
      description="Quản lý dữ liệu chủ SKU, cờ kiểm soát và quan hệ đóng gói cho vận hành WMS."
      state={state}
      columns={columns}
      rows={sortedSkus}
      rowKey={(sku) => sku.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      sort={sort}
      onSortChange={handleSortChange}
      emptyLabel={MASTER_DATA_EMPTY_LABELS.skus}
      errorMessage={apiError?.message ?? (query.error ? 'Không thể tải SKU.' : undefined)}
      canCreate={canCreate}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW}>Tạo SKU</Link>
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
                placeholder="Mã SKU"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <ComboboxSelect
              id="sku-status-filter"
              name="statusFilter"
              label="Trạng thái"
              value={itemStatus}
              placeholder="Tất cả"
              optional
              options={STATUS_FILTER_OPTIONS}
              onChange={(value) => {
                setItemStatus(value as SkuStatus | '');
                setPage(1);
              }}
            />
          </div>
          <div className="md:max-w-xs">
            <ComboboxSelect
              id="sku-default-owner-filter"
              name="defaultOwnerId"
              label="Chủ hàng mặc định"
              value={defaultOwnerId}
              placeholder="Tất cả"
              optional
              isLoading={ownersQuery.isLoading}
              options={owners.map((owner) => ({
                value: owner.id,
                label: `${owner.ownerCode} - ${owner.ownerName}`,
              }))}
              onChange={(value) => {
                setDefaultOwnerId(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      }
    />
  );
}
