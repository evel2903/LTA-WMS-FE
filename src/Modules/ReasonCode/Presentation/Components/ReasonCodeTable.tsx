import { Badge } from '@shared/Components/Ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import {
  actionListLabel,
  evidenceRequiredLabel,
  reasonCodeStatusLabel,
  reasonGroupLabel,
} from '@modules/ReasonCode/Presentation/Constants/ReasonCodeDisplayText';

interface ReasonCodeTableProps {
  items: ReasonCode[];
  selectedId: string | null;
  onSelect: (item: ReasonCode) => void;
}

export function ReasonCodeTable({ items, selectedId, onSelect }: ReasonCodeTableProps) {
  return (
    <div className="min-w-0">
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>Áp dụng cho hành động</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phiên bản</TableHead>
              <TableHead>Bằng chứng</TableHead>
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
                      aria-label={`Mở chi tiết mã lý do ${item.reasonCode}`}
                      className="text-left font-medium underline-offset-2 hover:underline"
                      onClick={() => onSelect(item)}
                    >
                      {item.reasonCode}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-52 whitespace-normal break-words">
                    {reasonGroupLabel(item.reasonGroup)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-64 whitespace-normal break-words text-xs">
                    {actionListLabel(item.appliesToActions)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'ACTIVE' ? 'success' : 'outline'}>
                      {reasonCodeStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{item.version}</TableCell>
                  <TableCell>{evidenceRequiredLabel(item.evidenceRequired)}</TableCell>
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
                <p className="break-all text-sm font-medium">{item.reasonCode}</p>
                <p className="text-muted-foreground break-words text-xs">{reasonGroupLabel(item.reasonGroup)}</p>
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">Hành động</dt>
                  <dd className="break-words">{actionListLabel(item.appliesToActions)}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-muted-foreground text-xs">Trạng thái</dt>
                  <dd>
                    <Badge variant={item.status === 'ACTIVE' ? 'success' : 'outline'}>
                      {reasonCodeStatusLabel(item.status)}
                    </Badge>
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground text-xs">Phiên bản {item.version}</span>
                  <span className="text-muted-foreground text-xs">
                    Bằng chứng: {evidenceRequiredLabel(item.evidenceRequired)}
                  </span>
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
                  aria-label={`Mở chi tiết mã lý do ${item.reasonCode}`}
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
