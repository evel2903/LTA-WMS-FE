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
    return <p className="text-muted-foreground py-12 text-center text-sm">No inventory found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">On hand</TableHead>
          <TableHead className="text-right">Available</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => onRowClick?.(item)}
          >
            <TableCell className="font-medium">{item.sku}</TableCell>
            <TableCell>{item.productName}</TableCell>
            <TableCell>{item.locationCode}</TableCell>
            <TableCell className="text-right">{item.quantityOnHand}</TableCell>
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
