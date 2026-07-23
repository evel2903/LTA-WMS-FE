import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@shared/Components/Page/CatalogListView';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { ApiError } from '@shared/Services/Http/ApiError';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useReceipts } from '@modules/InboundReceiving/Application/Queries/UseInboundReceivingState';
import type { Receipt } from '@modules/InboundReceiving/Domain/Types/Receipt';
import { useActiveOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useActiveWarehouses } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useUserEffectivePermissions } from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';

const DEFAULT_PAGE_SIZE = 50;

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Không xác định'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

function sourceLabel(receipt: Receipt) {
  return receipt.inboundPlanId ? 'Có kế hoạch' : 'Thủ công';
}

function supplierLabel(receipt: Receipt) {
  return (
    [receipt.supplierCode, receipt.supplierName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' - ') || 'Không xác định'
  );
}

export function InboundReceivingPage() {
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState>({
    column: 'createdAt',
    direction: 'desc',
  });
  const debouncedSearch = useDebouncedValue(search, 250);
  const debouncedOwnerSearch = useDebouncedValue(ownerSearch, 300);
  const debouncedWarehouseSearch = useDebouncedValue(warehouseSearch, 300);
  const ownerQuery = useActiveOwners(debouncedOwnerSearch);
  const warehouseQuery = useActiveWarehouses(debouncedWarehouseSearch);
  const sortBy = sort.column === 'receiptNumber' ? 'ReceiptNumber' : 'CreatedAt';
  const sortDirection = sort.direction === 'asc' ? 'ASC' : 'DESC';
  const query = useReceipts({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    ownerId: ownerId || undefined,
    warehouseId: warehouseId || undefined,
    sortBy,
    sortDirection,
  });
  const user = useAuthStore((state) => state.user);
  const effectivePermissionsQuery = useUserEffectivePermissions(user?.id ?? null);
  const permissionResolved =
    !effectivePermissionsQuery.isLoading &&
    !effectivePermissionsQuery.isFetching &&
    !effectivePermissionsQuery.isError;
  const canCreateReceipt = Boolean(
    effectivePermissionsQuery.data?.permissions.some(
      (permission) => permission.action === 'Create' && permission.objectType === 'Receipt',
    ),
  );
  const ownerOptions = useMemo(
    () =>
      (ownerQuery.data?.items ?? []).map((owner) => ({
        value: owner.id,
        label: `${owner.ownerCode} - ${owner.ownerName}`,
      })),
    [ownerQuery.data?.items],
  );
  const warehouseOptions = useMemo(
    () =>
      (warehouseQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
      })),
    [warehouseQuery.data?.items],
  );
  const hasCurrentPagination = query.data?.page === page && query.data.pageSize === pageSize;
  const isQueryPending =
    query.isLoading || query.isFetching || (query.data != null && !hasCurrentPagination);
  const receipts = useMemo(
    () => (hasCurrentPagination ? (query.data?.items ?? []) : []),
    [hasCurrentPagination, query.data?.items],
  );
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.error
      ? 'error'
      : isQueryPending
        ? 'loading'
        : receipts.length === 0
          ? 'empty'
          : 'ready';
  // Keep the requested page reachable while TanStack Query still exposes metadata
  // from the previous response. Clamp only after the current page response arrives.
  const totalPages = hasCurrentPagination
    ? (query.data?.totalPages ?? 1)
    : Math.max(query.data?.totalPages ?? 1, page);

  useEffect(() => {
    const serverPage = query.data?.page;
    if (
      query.isFetching ||
      query.error ||
      serverPage == null ||
      query.data?.pageSize !== pageSize ||
      serverPage === page
    ) {
      return;
    }
    setPage(serverPage);
  }, [page, pageSize, query.data?.page, query.data?.pageSize, query.error, query.isFetching]);

  const columns: CatalogColumn<Receipt>[] = [
    {
      id: 'receiptNumber',
      header: 'Số phiếu',
      sortable: true,
      render: (receipt) => (
        <span className="break-words font-medium text-foreground">{receipt.receiptNumber}</span>
      ),
      mobileLabel: 'Phiếu nhập kho',
      mobileRender: (receipt) => (
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold text-foreground">
            {receipt.receiptNumber}
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {sourceLabel(receipt)} · {receipt.businessReference}
          </p>
          <span className="mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium text-foreground">
            {vietnameseOperationalLabel(receipt.status)}
          </span>
        </div>
      ),
    },
    {
      header: 'Nguồn',
      render: sourceLabel,
      mobileHidden: true,
    },
    {
      header: 'Tham chiếu',
      render: (receipt) => <span className="break-words">{receipt.businessReference}</span>,
      className: 'max-w-64 whitespace-normal',
      mobileHidden: true,
    },
    {
      header: 'Kho',
      render: (receipt) => receipt.warehouseCode?.trim() || receipt.warehouseId,
    },
    {
      header: 'Chủ hàng',
      render: (receipt) => receipt.ownerCode?.trim() || receipt.ownerId,
    },
    {
      header: 'Nhà cung cấp',
      render: (receipt) => <span className="break-words">{supplierLabel(receipt)}</span>,
      className: 'max-w-64 whitespace-normal',
    },
    {
      header: 'Trạng thái',
      render: (receipt) => vietnameseOperationalLabel(receipt.status),
      mobileHidden: true,
    },
    {
      id: 'createdAt',
      header: 'Tạo lúc',
      sortable: true,
      render: (receipt) => formatDateTime(receipt.createdAt),
    },
    {
      header: 'Hành động',
      render: (receipt) => (
        <Button asChild size="sm">
          <Link to={ROUTES.INBOUND_RECEIVING.RECEIPT_DETAIL(receipt.id)}>Mở phiếu</Link>
        </Button>
      ),
    },
  ];

  function changeSort(column: string) {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' },
    );
    setPage(1);
  }

  function changeMobileSort(value: string) {
    switch (value) {
      case 'createdAt:asc':
        setSort({ column: 'createdAt', direction: 'asc' });
        break;
      case 'receiptNumber:asc':
        setSort({ column: 'receiptNumber', direction: 'asc' });
        break;
      case 'receiptNumber:desc':
        setSort({ column: 'receiptNumber', direction: 'desc' });
        break;
      default:
        setSort({ column: 'createdAt', direction: 'desc' });
        break;
    }
    setPage(1);
  }

  return (
    <CatalogListView
      title="Phiếu nhập kho"
      description="Theo dõi cả phiếu sinh từ kế hoạch và phiếu tiếp nhận thủ công."
      headerAction={
        <>
          {permissionResolved && canCreateReceipt ? (
            <Button asChild>
              <Link to={ROUTES.INBOUND_RECEIVING.NEW}>
                <Plus className="size-4" aria-hidden="true" />
                Tạo phiếu thủ công
              </Link>
            </Button>
          ) : permissionResolved ? (
            <span className="text-sm text-muted-foreground">Chế độ chỉ đọc</span>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Làm mới danh sách phiếu nhập kho"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </>
      }
      toolbar={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid min-w-0 gap-1 text-sm">
            Tìm số phiếu hoặc tham chiếu nghiệp vụ
            <Input
              name="receiptSearch"
              value={search}
              placeholder="RCPT- hoặc MANUAL:"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <ComboboxSelect
            id="receipt-owner-filter"
            name="ownerId"
            label="Chủ hàng"
            value={ownerId}
            placeholder="Tất cả chủ hàng"
            options={ownerOptions}
            isLoading={ownerQuery.isLoading}
            isError={ownerQuery.isError}
            emptyMessage="Không có chủ hàng hoạt động."
            errorMessage="Không tải được chủ hàng."
            searchValue={ownerSearch}
            searchPlaceholder="Tìm chủ hàng..."
            onSearchChange={setOwnerSearch}
            optional
            onChange={(value) => {
              setOwnerId(value);
              setPage(1);
            }}
          />
          <ComboboxSelect
            id="receipt-warehouse-filter"
            name="warehouseId"
            label="Kho"
            value={warehouseId}
            placeholder="Tất cả kho"
            options={warehouseOptions}
            isLoading={warehouseQuery.isLoading}
            isError={warehouseQuery.isError}
            emptyMessage="Không có kho hoạt động."
            errorMessage="Không tải được kho."
            searchValue={warehouseSearch}
            searchPlaceholder="Tìm kho..."
            onSearchChange={setWarehouseSearch}
            optional
            onChange={(value) => {
              setWarehouseId(value);
              setPage(1);
            }}
          />
          <label className="grid min-w-0 gap-1 text-sm md:hidden">
            Sắp xếp
            <select
              aria-label="Sắp xếp phiếu nhập kho"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={`${sort.column}:${sort.direction}`}
              onChange={(event) => changeMobileSort(event.target.value)}
            >
              <option value="createdAt:desc">Tạo lúc mới nhất</option>
              <option value="createdAt:asc">Tạo lúc cũ nhất</option>
              <option value="receiptNumber:asc">Số phiếu tăng dần</option>
              <option value="receiptNumber:desc">Số phiếu giảm dần</option>
            </select>
          </label>
        </div>
      }
      state={state}
      columns={columns}
      rows={receipts}
      rowKey={(receipt) => receipt.id}
      page={page}
      totalPages={totalPages}
      totalItems={hasCurrentPagination ? query.data?.totalItems : undefined}
      itemLabel="phiếu"
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(nextPageSize) => {
        setPageSize(nextPageSize);
        setPage(1);
      }}
      sort={sort}
      onSortChange={changeSort}
      errorMessage={
        apiError?.isForbidden
          ? undefined
          : query.error
            ? 'Không thể tải danh sách phiếu nhập kho.'
            : undefined
      }
      emptyLabel={
        permissionResolved && canCreateReceipt
          ? 'Tạo phiếu thủ công hoặc bắt đầu tiếp nhận từ một kế hoạch nhập kho.'
          : 'Chưa có phiếu nhập kho trong phạm vi hiện tại.'
      }
      canCreate={permissionResolved ? canCreateReceipt : true}
      readOnlyTitle="Chế độ chỉ đọc"
      readOnlyMessage="Bạn không có quyền tạo phiếu nhập kho trong phạm vi này."
    />
  );
}
