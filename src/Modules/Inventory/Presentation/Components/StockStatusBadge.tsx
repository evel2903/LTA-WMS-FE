import { Badge } from '@shared/Components/Ui/Badge';
import { STOCK_STATUS_LABELS } from '@modules/Inventory/Domain/Constants/InventoryConstants';
import type { StockStatus } from '@modules/Inventory/Domain/Entities/InventoryItem';

const VARIANT: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
  IN_STOCK: 'success',
  LOW_STOCK: 'warning',
  OUT_OF_STOCK: 'destructive',
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return <Badge variant={VARIANT[status]}>{STOCK_STATUS_LABELS[status]}</Badge>;
}
