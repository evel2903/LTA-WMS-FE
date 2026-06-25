import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { PageSpinner } from '@shared/Components/Feedback/Spinner';
import {
  availableQuantity,
  stockStatus,
} from '@modules/Inventory/Domain/Entities/InventoryItem';
import { useInventoryItem } from '@modules/Inventory/Application/Queries/UseInventoryItem';
import { StockStatusBadge } from '@modules/Inventory/Presentation/Components/StockStatusBadge';
import { AdjustQuantityForm } from '@modules/Inventory/Presentation/Forms/AdjustQuantityForm';

export function InventoryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: item, isLoading } = useInventoryItem(id);

  if (isLoading) return <PageSpinner />;
  if (!item) return <p className="text-muted-foreground">Item not found.</p>;

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
            <Field label="Location" value={item.locationCode} />
            <Field label="On hand" value={String(item.quantityOnHand)} />
            <Field label="Reserved" value={String(item.quantityReserved)} />
            <Field label="Khả dụng" value={String(availableQuantity(item))} />
            <Field label="Đơn vị" value={item.unitOfMeasure} />
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
