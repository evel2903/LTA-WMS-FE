import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { usePackages } from '@modules/Packing/Application/Queries/UsePacking';
import { PACKAGE_STATUSES } from '@modules/Packing/Domain/Constants/PackingConstants';
import type { Package, PackageStatus } from '@modules/Packing/Domain/Types/Packing';

type StatusFilter = 'All' | PackageStatus;

function StatusBadge({ status }: { status: PackageStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function packageDimensions(pack: Package): string {
  const dimensions = [pack.length, pack.width, pack.height].filter(
    (value): value is number => typeof value === 'number',
  );
  return dimensions.length === 3 ? dimensions.join(' x ') : 'Chưa có kích thước';
}

function PackageRow({ pack }: { pack: Package }) {
  return (
    <Link
      to={ROUTES.PACKING.DETAIL(pack.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{pack.packageCode}</div>
          <div className="text-muted-foreground text-xs">{pack.pickTaskId}</div>
        </div>
        <StatusBadge status={pack.status} />
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <div>Kho: {pack.warehouseCode ?? pack.warehouseId ?? 'chưa xác định'}</div>
        <div>Chủ hàng: {pack.ownerCode ?? pack.ownerId ?? 'chưa xác định'}</div>
        <div>
          Thùng: {pack.cartonType} | Khối lượng: {pack.weight ?? 'không áp dụng'} | Kích thước:{' '}
          {packageDimensions(pack)}
        </div>
        <div>Nội dung: {pack.contents.length}</div>
        {pack.labelPrintJobCode ? <div>Nhãn: {pack.labelPrintJobCode}</div> : null}
      </div>
    </Link>
  );
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể tải kiện hàng.';
}

export function PackingPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [pickTaskId, setPickTaskId] = useState('');
  const [outboundOrderId, setOutboundOrderId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');

  const query = usePackages({
    warehouseId: warehouseId.trim() || undefined,
    ownerId: ownerId.trim() || undefined,
    pickTaskId: pickTaskId.trim() || undefined,
    outboundOrderId: outboundOrderId.trim() || undefined,
    status: status === 'All' ? undefined : status,
  });
  const packages = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = apiError?.isForbidden
    ? 'forbidden'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : packages.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Kiện đóng gói"
      description="Quét công việc đóng gói và mở trang chi tiết để kiểm tra, đóng kiện và sẵn sàng staging."
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : query.error
            ? 'Không thể tải kiện hàng'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem kiện hàng.'
          : query.error
            ? (errorMessage(query.error) ?? 'Không thể tải kiện hàng.')
            : 'Không có kiện hàng khớp bộ lọc.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.PACKING.NEW}>
            <PackagePlus className="size-4" aria-hidden="true" />
            Tạo kiện hàng
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-5">
          <label className="grid gap-1 text-sm">
            Kho
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Chủ hàng
            <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Tác vụ lấy hàng
            <Input value={pickTaskId} onChange={(event) => setPickTaskId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Đơn xuất kho
            <Input
              value={outboundOrderId}
              onChange={(event) => setOutboundOrderId(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Trạng thái
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              <option value="All">Tất cả</option>
              {PACKAGE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {vietnameseOperationalLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Đang tải kiện hàng
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pack) => (
            <PackageRow key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}
