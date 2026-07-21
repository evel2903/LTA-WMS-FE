import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { SearchableLookupSelect } from '@shared/Components/Ui/SearchableLookupSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useReceipts } from '@modules/InboundReceiving/Application/Queries/UseInboundReceivingState';
import { useActiveOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useActiveWarehouses } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useUserEffectivePermissions } from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function InboundReceivingPage() {
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [sort, setSort] = useState<'CreatedAt:DESC' | 'CreatedAt:ASC' | 'ReceiptNumber:ASC' | 'ReceiptNumber:DESC'>(
    'CreatedAt:DESC',
  );
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 250);
  const debouncedOwnerSearch = useDebouncedValue(ownerSearch, 300);
  const debouncedWarehouseSearch = useDebouncedValue(warehouseSearch, 300);
  const ownerQuery = useActiveOwners(debouncedOwnerSearch);
  const warehouseQuery = useActiveWarehouses(debouncedWarehouseSearch);
  const [sortBy, sortDirection] = sort.split(':') as [
    'CreatedAt' | 'ReceiptNumber',
    'ASC' | 'DESC',
  ];
  const query = useReceipts({
    page,
    pageSize: 50,
    search: debouncedSearch || undefined,
    ownerId: ownerId || undefined,
    warehouseId: warehouseId || undefined,
    sortBy,
    sortDirection,
  });
  const user = useAuthStore((state) => state.user);
  const effectivePermissionsQuery = useUserEffectivePermissions(user?.id ?? null);
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
  const receipts = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = query.isLoading
    ? 'loading'
    : apiError?.isForbidden
      ? 'forbidden'
      : query.error
        ? 'error'
        : receipts.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Phiếu nhập kho"
      description="Theo dõi cả phiếu sinh từ kế hoạch và phiếu tiếp nhận thủ công."
      toolbar={
        <>
          {canCreateReceipt ? (
            <Button asChild>
              <Link to={ROUTES.INBOUND_RECEIVING.NEW}>
                <Plus className="size-4" aria-hidden="true" />
                Tạo phiếu thủ công
              </Link>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Chế độ chỉ đọc</span>
          )}
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
      filters={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">
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
          <SearchableLookupSelect
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
            onChange={(value) => {
              setOwnerId(value);
              setPage(1);
            }}
          />
          <SearchableLookupSelect
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
            onChange={(value) => {
              setWarehouseId(value);
              setPage(1);
            }}
          />
          <label className="grid gap-1 text-sm" htmlFor="receipt-sort">
            Sắp xếp
            <select
              id="receipt-sort"
              name="receiptSort"
              value={sort}
              className="min-h-10 rounded-md border bg-background px-3 py-2 text-sm"
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
            >
              <option value="CreatedAt:DESC">Mới nhất</option>
              <option value="CreatedAt:ASC">Cũ nhất</option>
              <option value="ReceiptNumber:ASC">Số phiếu tăng dần</option>
              <option value="ReceiptNumber:DESC">Số phiếu giảm dần</option>
            </select>
          </label>
        </div>
      }
      state={state}
      stateTitle={
        state === 'forbidden'
          ? 'Từ chối quyền truy cập'
          : state === 'error'
            ? 'Không thể tải phiếu nhập kho'
            : 'Chưa có phiếu nhập kho'
      }
      stateMessage={
        state === 'empty'
          ? 'Tạo phiếu thủ công hoặc bắt đầu tiếp nhận từ một kế hoạch nhập kho.'
          : undefined
      }
    >
      <Table data-testid="receipt-table">
        <TableHeader>
          <TableRow>
            <TableHead>Số phiếu</TableHead>
            <TableHead>Nguồn</TableHead>
            <TableHead>Tham chiếu</TableHead>
            <TableHead>Kho</TableHead>
            <TableHead>Chủ hàng</TableHead>
            <TableHead>Nhà cung cấp</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Tạo lúc</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
              <TableCell>{receipt.inboundPlanId ? 'Có kế hoạch' : 'Thủ công'}</TableCell>
              <TableCell>{receipt.businessReference}</TableCell>
              <TableCell>{receipt.warehouseCode ?? receipt.warehouseId}</TableCell>
              <TableCell>{receipt.ownerCode ?? receipt.ownerId}</TableCell>
              <TableCell>
                {[receipt.supplierCode, receipt.supplierName].filter(Boolean).join(' - ') ||
                  'Không xác định'}
              </TableCell>
              <TableCell>{vietnameseOperationalLabel(receipt.status)}</TableCell>
              <TableCell>{formatDateTime(receipt.createdAt)}</TableCell>
              <TableCell>
                <Button asChild size="sm">
                  <Link to={ROUTES.INBOUND_RECEIVING.RECEIPT_DETAIL(receipt.id)}>Mở phiếu</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {query.data && query.data.totalPages > 1 ? (
        <div className="flex items-center justify-between border-t px-2 pt-3 text-sm">
          <span className="text-muted-foreground">
            Trang {query.data.page} / {query.data.totalPages} · {query.data.totalItems} phiếu
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Trang trước
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= query.data.totalPages}
              onClick={() => setPage((value) => Math.min(query.data.totalPages, value + 1))}
            >
              Trang sau
            </Button>
          </div>
        </div>
      ) : null}
    </ListPageShell>
  );
}
