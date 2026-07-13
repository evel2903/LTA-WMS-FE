import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import {
  MASTER_DATA_EMPTY_LABELS,
  MASTER_DATA_STATUS_LABELS,
} from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import type { Owner } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Active', label: MASTER_DATA_STATUS_LABELS.Active },
  { value: 'Inactive', label: MASTER_DATA_STATUS_LABELS.Inactive },
];

function compareOwners(a: Owner, b: Owner, column: string): number {
  switch (column) {
    case 'code':
      return a.ownerCode.localeCompare(b.ownerCode, 'vi', { numeric: true });
    case 'name':
      return a.ownerName.localeCompare(b.ownerName, 'vi');
    case 'status':
      return a.status.localeCompare(b.status, 'vi');
    default:
      return 0;
  }
}

// Sort is client-side and scoped to the current server page only (server
// pagination is kept as-is; the BE has no sort param), matching DSR-05/Loại kho.
function sortOwners(items: Owner[], sort: CatalogSortState | null): Owner[] {
  if (!sort) return items;
  const sorted = [...items].sort((a, b) => compareOwners(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function OwnerMasterPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MasterDataStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(MASTER_DATA_DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);

  const debouncedCode = useDebouncedValue(searchTerm);
  const query = useOwners({
    page,
    pageSize,
    status: statusFilter || undefined,
    ownerCode: debouncedCode || undefined,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const sortedItems = useMemo(() => sortOwners(items, sort), [items, sort]);

  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden;

  function handleSortChange(column: string) {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }

  const columns: CatalogColumn<Owner>[] = [
    {
      id: 'code',
      header: 'Mã',
      render: (row) => <span className="font-medium">{row.ownerCode}</span>,
      sortable: true,
    },
    { id: 'name', header: 'Tên', render: (row) => row.ownerName, sortable: true },
    { id: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} />, sortable: true },
    {
      header: 'Hành động',
      render: (row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(row.id))}
        >
          Xem
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <CatalogListView
      title="Chủ hàng"
      description="Quản lý chủ hàng (khách hàng 3PL / chủ thương hiệu)."
      state={state}
      columns={columns}
      rows={sortedItems}
      rowKey={(row) => row.id}
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
      emptyLabel={MASTER_DATA_EMPTY_LABELS.owners}
      errorMessage={apiError?.message ?? (query.error ? 'Không thể tải chủ hàng.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.OWNER_NEW}>Tạo chủ hàng</Link>
          </Button>
        ) : null
      }
      toolbar={
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
          <label className="grid min-w-0 gap-1 text-sm">
            Tìm
            <Input
              className="min-w-0"
              placeholder="Mã chủ hàng"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <ComboboxSelect
            id="owner-status-filter"
            name="statusFilter"
            label="Trạng thái"
            value={statusFilter}
            placeholder="Tất cả"
            optional
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => {
              setStatusFilter(value as MasterDataStatus | '');
              setPage(1);
            }}
          />
        </div>
      }
    />
  );
}
