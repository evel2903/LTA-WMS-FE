import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useInventoryList } from '@modules/Inventory/Application/Queries/UseInventoryList';
import { useInventoryFilterStore } from '@modules/Inventory/Application/Stores/InventoryFilterStore';
import { InventoryTable } from '@modules/Inventory/Presentation/Components/InventoryTable';
import { InventoryToolbar } from '@modules/Inventory/Presentation/Components/InventoryToolbar';
import { availableQuantity } from '@modules/Inventory/Domain/Entities/InventoryItem';

/**
 * Inventory list page. Composes module-local state (filter store) with
 * server state (useInventoryList) and presentational components. It wires
 * pieces together — it contains no business or fetching logic itself.
 */
export function InventoryPage() {
  const navigate = useNavigate();
  const filter = useInventoryFilterStore();
  const setPage = useInventoryFilterStore((s) => s.setPage);
  const { data, error, isError, isLoading, isFetching } = useInventoryList({
    page: filter.page,
    pageSize: filter.pageSize,
    search: filter.search,
    status: filter.status,
    warehouseId: filter.warehouseId,
  });
  const isContractGap = error instanceof ApiError && error.code === 'NOT_FOUND';
  const items = isError ? [] : (data?.items ?? []);
  const totals = items.reduce(
    (acc, item) => ({
      onHand: acc.onHand + item.quantityOnHand,
      allocated: acc.allocated + item.quantityReserved,
      available: acc.available + availableQuantity(item),
    }),
    { onHand: 0, allocated: 0, available: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tồn kho</h1>
          <p className="text-muted-foreground">
            Tìm theo SKU, lô, LPN hoặc vị trí; thao tác vận hành nằm ở trang chi tiết.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Dòng tồn kho {data ? `(${data.totalItems})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InventoryToolbar />

          {!isError && (
            <dl className="border-border bg-muted/30 grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-3">
              <Metric label="Tồn hiện có trên trang hiện tại" value={totals.onHand} />
              <Metric label="Đã phân bổ/giữ chỗ trên trang hiện tại" value={totals.allocated} />
              <Metric label="Khả dụng trên trang hiện tại" value={totals.available} />
            </dl>
          )}

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="font-medium">
              Khả dụng = max(0, Tồn hiện có - Đã phân bổ/giữ chỗ - Đang giữ)
            </div>
            <p className="mt-1">
              Chưa có hợp đồng API khi chạy riêng cho lô/LPN và đang giữ; các cột này không tự
              bịa dữ liệu và sẽ được nối vào mô hình đọc khi BE/API được xác nhận.
            </p>
          </div>

          {isError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
            >
              <div className="font-medium">
                {isContractGap
                  ? 'Chưa xác nhận được hợp đồng API khi chạy cho tồn kho.'
                  : 'Không tải được dữ liệu tồn kho.'}
              </div>
              <p className="text-muted-foreground mt-1">
                {isContractGap
                  ? 'Màn tồn kho cũ đang gọi `/inventory`; BE chưa xác nhận controller tương ứng trong project context. Không hiển thị dữ liệu tồn kho như năng lực chạy thực tế cho tới khi mô hình đọc được khóa.'
                  : 'Vui lòng kiểm tra quyền truy cập, phiên đăng nhập hoặc trạng thái máy chủ rồi thử lại.'}
              </p>
              {error instanceof Error && (
                <p className="text-muted-foreground mt-1 text-xs">{error.message}</p>
              )}
            </div>
          ) : (
            <InventoryTable
              items={items}
              isLoading={isLoading}
              onRowClick={(item) => navigate(ROUTES.INVENTORY.DETAIL(item.id))}
            />
          )}

          {!isError && data && data.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(filter.page ?? 1) <= 1 || isFetching}
                onClick={() => setPage((filter.page ?? 1) - 1)}
              >
                Trước
              </Button>
              <span className="text-muted-foreground text-sm">
                Trang {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(filter.page ?? 1) >= data.totalPages || isFetching}
                onClick={() => setPage((filter.page ?? 1) + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
