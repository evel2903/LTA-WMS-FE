import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import {
  PARTNER_DEFAULT_PAGE_SIZE,
  PARTNER_STATUSES,
  PARTNER_TYPES,
} from '@modules/PartnerMaster/Domain/Constants/PartnerConstants';
import { PARTNER_EMPTY_LABEL_VI, displayPartnerType } from '@modules/PartnerMaster/Presentation/Constants/PartnerDisplayText';
import type { Partner, PartnerStatus, PartnerType } from '@modules/PartnerMaster/Domain/Types/Partner';
import { usePartners } from '@modules/PartnerMaster/Application/Queries/UsePartners';

type PartnerTypeFilter = 'All' | PartnerType;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  ...PARTNER_STATUSES.map((item) => ({ value: item, label: item === 'Active' ? 'Đang hoạt động' : 'Không hoạt động' })),
];

function comparePartners(a: Partner, b: Partner, column: string): number {
  switch (column) {
    case 'code':
      return a.partnerCode.localeCompare(b.partnerCode, 'vi', { numeric: true });
    case 'name':
      return a.partnerName.localeCompare(b.partnerName, 'vi');
    case 'type':
      return displayPartnerType(a.partnerType).localeCompare(displayPartnerType(b.partnerType), 'vi');
    case 'reference':
      return (a.externalReference ?? '').localeCompare(b.externalReference ?? '', 'vi');
    case 'status':
      return a.status.localeCompare(b.status, 'vi');
    default:
      return 0;
  }
}

// Sort is client-side and scoped to the current server page only (server
// pagination is kept as-is; the BE has no sort param), matching DSR-05/Loại kho.
function sortPartners(items: Partner[], sort: CatalogSortState | null): Partner[] {
  if (!sort) return items;
  const sorted = [...items].sort((a, b) => comparePartners(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function PartnerMasterPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | ''>('');
  const [nameFilter, setNameFilter] = useState('');
  const [externalReferenceFilter, setExternalReferenceFilter] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerTypeFilter>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PARTNER_DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);

  const partnerCode = useDebouncedValue(searchTerm);
  const partnerName = useDebouncedValue(nameFilter);
  const externalReference = useDebouncedValue(externalReferenceFilter);
  const query = usePartners({
    page,
    pageSize,
    partnerCode: partnerCode || undefined,
    partnerName: partnerName || undefined,
    externalReference: externalReference || undefined,
    partnerType: partnerType === 'All' ? undefined : partnerType,
    status: statusFilter || undefined,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const sortedItems = useMemo(() => sortPartners(items, sort), [items, sort]);

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

  const columns: CatalogColumn<Partner>[] = [
    {
      id: 'code',
      header: 'Mã',
      render: (row) => <span className="font-medium">{row.partnerCode}</span>,
      sortable: true,
    },
    { id: 'name', header: 'Tên', render: (row) => row.partnerName, sortable: true },
    { id: 'type', header: 'Loại', render: (row) => displayPartnerType(row.partnerType), sortable: true },
    { id: 'reference', header: 'Tham chiếu ngoài', render: (row) => row.externalReference, sortable: true },
    { id: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} />, sortable: true },
    {
      header: 'Hành động',
      render: (row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL(row.id))}
        >
          Xem
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <CatalogListView
      title="Đối tác"
      description="Quản lý nhà cung cấp, khách hàng và đơn vị vận chuyển tối thiểu cho luồng V1."
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
      emptyLabel={PARTNER_EMPTY_LABEL_VI}
      errorMessage={apiError?.message ?? (query.error ? 'Không thể tải đối tác.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_NEW}>Tạo đối tác</Link>
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
                placeholder="Mã đối tác"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <ComboboxSelect
              id="partner-status-filter"
              name="statusFilter"
              label="Trạng thái"
              value={statusFilter}
              placeholder="Tất cả"
              optional
              options={STATUS_FILTER_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value as PartnerStatus | '');
                setPage(1);
              }}
            />
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <label className="grid min-w-0 gap-1 text-sm">
              Tên đối tác
              <Input
                className="min-w-0"
                placeholder="Tìm theo tên"
                value={nameFilter}
                onChange={(event) => {
                  setNameFilter(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              Tham chiếu ngoài
              <Input
                className="min-w-0"
                placeholder="Tìm theo tham chiếu"
                value={externalReferenceFilter}
                onChange={(event) => {
                  setExternalReferenceFilter(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              Loại đối tác
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={partnerType}
                onChange={(event) => {
                  setPartnerType(event.target.value as PartnerTypeFilter);
                  setPage(1);
                }}
              >
                <option value="All">Tất cả</option>
                {PARTNER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {displayPartnerType(type)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      }
    />
  );
}
