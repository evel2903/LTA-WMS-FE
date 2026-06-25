import { Badge } from '@shared/Components/Ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';

interface InventoryStatusTableProps {
  items: InventoryStatus[];
  selectedId: string | null;
  onSelect: (item: InventoryStatus) => void;
}

/** A boolean behaviour flag rendered as the matrix glyph used across C10/C14 (✓ on, · off). */
function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span aria-label={`${label}: ${on ? 'yes' : 'no'}`} className={on ? '' : 'text-muted-foreground'}>
      {on ? '✓' : '·'}
    </span>
  );
}

export function InventoryStatusTable({ items, selectedId, onSelect }: InventoryStatusTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã trạng thái</TableHead>
          <TableHead>Tên hiển thị</TableHead>
          <TableHead>Nhóm chặng</TableHead>
          <TableHead className="text-center">Cho phân bổ</TableHead>
          <TableHead className="text-center">Cho lấy hàng</TableHead>
          <TableHead className="text-center">Giữ hàng</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="text-right">Thứ tự</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            data-selected={item.id === selectedId}
            className="data-[selected=true]:bg-muted"
          >
            <TableCell>
              <button className="underline-offset-2 hover:underline" onClick={() => onSelect(item)}>
                {item.statusCode}
              </button>
            </TableCell>
            <TableCell>{item.displayName}</TableCell>
            <TableCell className="text-muted-foreground">{item.stageGroup}</TableCell>
            <TableCell className="text-center">
              <Flag on={item.allowsAllocation} label="Cho phân bổ" />
            </TableCell>
            <TableCell className="text-center">
              <Flag on={item.allowsPick} label="Cho lấy hàng" />
            </TableCell>
            <TableCell className="text-center">
              <Flag on={item.hold} label="Hold" />
            </TableCell>
            <TableCell>
              <Badge variant={item.status === 'Active' ? 'success' : 'outline'}>{item.status}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{item.sortOrder}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
