import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { PageSpinner } from '@shared/Components/Feedback/Spinner';
import { ApiError } from '@shared/Services/Http/ApiError';
import {
  availableQuantity,
  stockStatus,
} from '@modules/Inventory/Domain/Entities/InventoryItem';
import { useInventoryItem } from '@modules/Inventory/Application/Queries/UseInventoryItem';
import { StockStatusBadge } from '@modules/Inventory/Presentation/Components/StockStatusBadge';
import { AdjustQuantityForm } from '@modules/Inventory/Presentation/Forms/AdjustQuantityForm';

export function InventoryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: item, error, isError, isLoading } = useInventoryItem(id);
  const isContractGap = error instanceof ApiError && error.code === 'NOT_FOUND';

  if (isLoading) return <PageSpinner />;
  if (isError) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <div className="font-medium">
          {isContractGap
            ? 'Chưa xác nhận được hợp đồng API khi chạy cho chi tiết tồn kho.'
            : 'Không tải được chi tiết tồn kho.'}
        </div>
        <p className="text-muted-foreground mt-1">
          {isContractGap
            ? 'BE chưa xác nhận controller chi tiết tương ứng cho màn tồn kho cũ. Không hiển thị dữ liệu như năng lực chạy thực tế cho tới khi mô hình đọc được khóa.'
            : 'Vui lòng kiểm tra quyền truy cập, phiên đăng nhập hoặc trạng thái máy chủ rồi thử lại.'}
        </p>
        {error instanceof Error && <p className="text-muted-foreground mt-1 text-xs">{error.message}</p>}
      </div>
    );
  }
  if (!item) return <p className="text-muted-foreground">Không tìm thấy tồn kho.</p>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to={ROUTES.INVENTORY.ROOT}>
          <ArrowLeft className="size-4" />
          Quay lại tồn kho
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{item.productName}</CardTitle>
            <StockStatusBadge status={stockStatus(item)} />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="SKU" value={item.sku} />
            <Field label="Vị trí" value={item.locationCode} />
            <Field label="Tồn hiện có" value={String(item.quantityOnHand)} />
            <Field label="Đã giữ chỗ" value={String(item.quantityReserved)} />
            <Field label="Khả dụng" value={String(availableQuantity(item))} />
            <Field label="Đơn vị" value={item.unitOfMeasure} />
            <div className="text-muted-foreground col-span-2 rounded-md border p-3 text-xs">
              Khả dụng = max(0, Tồn hiện có - Đã phân bổ/giữ chỗ - Đang giữ). Trường
              đang giữ riêng chưa có hợp đồng API khi chạy trong dữ liệu FE hiện tại.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Điều chỉnh tồn kho</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustQuantityForm itemId={item.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
