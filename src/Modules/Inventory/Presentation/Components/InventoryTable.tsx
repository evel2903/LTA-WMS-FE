import {
  availableQuantity,
  stockStatus,
  type InventoryItem,
} from '@modules/Inventory/Domain/Entities/InventoryItem';
import { StockStatusBadge } from '@modules/Inventory/Presentation/Components/StockStatusBadge';
import { PageSpinner } from '@shared/Components/Feedback/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
}

/**
 * Pure presentational table. Receives Domain entities and derives display
 * values via Domain functions (`availableQuantity`, `stockStatus`). No data
 * fetching, no state — UI logic only (architecture rule 1).
 */
export function InventoryTable({ items, isLoading, onRowClick }: InventoryTableProps) {
  if (isLoading) return <PageSpinner />;

  if (items.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">Chưa có tồn kho phù hợp.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sản phẩm / SKU</TableHead>
          <TableHead>Lô / LPN</TableHead>
          <TableHead>Vị trí</TableHead>
          <TableHead className="text-right">Tồn hiện có</TableHead>
          <TableHead className="text-right">Đã phân bổ</TableHead>
          <TableHead className="text-right">Đang giữ</TableHead>
          <TableHead className="text-right">Khả dụng</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => onRowClick?.(item)}
          >
            <TableCell>
              <div className="font-medium">{item.productName}</div>
              <div className="text-muted-foreground text-xs">{item.sku}</div>
            </TableCell>
            <TableCell>
              <div className="text-muted-foreground text-xs">Chưa có dữ liệu</div>
            </TableCell>
            <TableCell>{item.locationCode}</TableCell>
            <TableCell className="text-right">{item.quantityOnHand}</TableCell>
            <TableCell className="text-right">{item.quantityReserved}</TableCell>
            <TableCell className="text-muted-foreground text-right">-</TableCell>
            <TableCell className="text-right">{availableQuantity(item)}</TableCell>
            <TableCell>
              <StockStatusBadge status={stockStatus(item)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
