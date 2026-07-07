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
import {
  booleanFlagValueLabel,
  masterDataStatusLabel,
} from '@modules/InventoryStatus/Presentation/Constants/InventoryStatusDisplayText';

interface InventoryStatusTableProps {
  items: InventoryStatus[];
  selectedId: string | null;
  onSelect: (item: InventoryStatus) => void;
}

function Flag({ on, label }: { on: boolean; label: string }) {
  const valueLabel = booleanFlagValueLabel(on);

  return (
    <span
      aria-label={`${label}: ${valueLabel}`}
      className={
        on
          ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
          : 'text-muted-foreground inline-flex rounded-full bg-muted px-2 py-0.5 text-xs'
      }
    >
      {valueLabel}
    </span>
  );
}

export function InventoryStatusTable({ items, selectedId, onSelect }: InventoryStatusTableProps) {
  return (
    <div className="min-w-0">
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Mã trạng thái</TableHead>
              <TableHead>Tên hiển thị</TableHead>
              <TableHead>Nhóm chặng</TableHead>
              <TableHead className="text-center">Cho phân bổ</TableHead>
              <TableHead className="text-center">Cho lấy hàng</TableHead>
              <TableHead className="text-center">Tạm giữ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thứ tự</TableHead>
              <TableHead className="w-28 text-right">Chọn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const selected = item.id === selectedId;

              return (
                <TableRow key={item.id} data-state={selected ? 'selected' : undefined}>
                  <TableCell className="max-w-44 whitespace-normal break-all">
                    <button
                      type="button"
                      aria-label={`Mở chi tiết trạng thái tồn kho ${item.statusCode}`}
                      className="text-left font-medium underline-offset-2 hover:underline"
                      onClick={() => onSelect(item)}
                    >
                      {item.statusCode}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal break-words">{item.displayName}</TableCell>
                  <TableCell className="text-muted-foreground max-w-44 whitespace-normal break-words">
                    {item.stageGroup}
                  </TableCell>
                  <TableCell className="text-center">
                    <Flag on={item.allowsAllocation} label="Cho phân bổ" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Flag on={item.allowsPick} label="Cho lấy hàng" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Flag on={item.hold} label="Tạm giữ" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'Active' ? 'success' : 'outline'}>
                      {masterDataStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    {selected ? (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">Đang chọn</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Có thể mở</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <article key={item.id} className="border-border bg-card text-card-foreground min-w-0 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <p className="break-all text-sm font-medium">{item.statusCode}</p>
                <p className="text-muted-foreground break-words text-xs">{item.displayName}</p>
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">Nhóm chặng</dt>
                  <dd className="break-words">{item.stageGroup}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Cho phân bổ</dt>
                    <dd>
                      <Flag on={item.allowsAllocation} label="Cho phân bổ" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Cho lấy hàng</dt>
                    <dd>
                      <Flag on={item.allowsPick} label="Cho lấy hàng" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Tạm giữ</dt>
                    <dd>
                      <Flag on={item.hold} label="Tạm giữ" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Thứ tự</dt>
                    <dd className="tabular-nums">{item.sortOrder}</dd>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-muted-foreground text-xs">Trạng thái</dt>
                  <dd>
                    <Badge variant={item.status === 'Active' ? 'success' : 'outline'}>
                      {masterDataStatusLabel(item.status)}
                    </Badge>
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {selected ? (
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">Đang chọn</span>
                ) : (
                  <span className="text-muted-foreground text-xs">Có thể mở</span>
                )}
                <button
                  type="button"
                  aria-label={`Mở chi tiết trạng thái tồn kho ${item.statusCode}`}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium"
                  onClick={() => onSelect(item)}
                >
                  Mở chi tiết
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
