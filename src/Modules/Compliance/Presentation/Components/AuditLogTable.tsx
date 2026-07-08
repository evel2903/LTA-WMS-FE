import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { AuditLogEntry } from '@modules/Compliance/Domain/Entities/Compliance';
import {
  actorDisplayName,
  auditResultLabel,
  complianceActionLabel,
  objectReferenceLabelFromParts,
} from '@modules/Compliance/Presentation/Constants/ComplianceDisplayText';

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  selectedId: string | null;
  onSelect: (entry: AuditLogEntry) => void;
  isSelectionDisabled?: boolean;
}

export function AuditLogTable({
  entries,
  selectedId,
  onSelect,
  isSelectionDisabled = false,
}: AuditLogTableProps) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="hidden md:block">
        <Table
          aria-label="Danh sách nhật ký kiểm toán dạng bảng"
          className="min-w-[760px] table-fixed"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18%]">Thời gian</TableHead>
              <TableHead className="w-[22%]">Người thực hiện</TableHead>
              <TableHead className="w-[18%]">Hành động</TableHead>
              <TableHead className="w-[28%]">Đối tượng</TableHead>
              <TableHead className="w-[14%]">Kết quả</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isSelected = entry.id === selectedId;
              const occurredAt = new Date(entry.occurredAt).toLocaleString();
              const actionLabel = complianceActionLabel(entry.action);
              const objectLabel = objectReferenceLabelFromParts(
                entry.objectType,
                entry.objectCode,
                entry.objectId,
              );

              return (
                <TableRow
                  key={entry.id}
                  data-selected={isSelected}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  <TableCell className="whitespace-normal tabular-nums">
                    <button
                      type="button"
                      aria-label={`Mở chi tiết nhật ký kiểm toán ${actionLabel} ${objectLabel} lúc ${occurredAt}, bản ghi ${entry.id}`}
                      aria-pressed={isSelected}
                      className="break-words text-left underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSelectionDisabled}
                      onClick={() => onSelect(entry)}
                    >
                      {occurredAt}
                    </button>
                    {isSelected && (
                      <span className="text-primary mt-1 block text-xs font-medium">Đang chọn</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">
                    {actorDisplayName(entry.actorUserId, entry.actorType)}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">{actionLabel}</TableCell>
                  <TableCell className="whitespace-normal break-words">{objectLabel}</TableCell>
                  <TableCell className="whitespace-normal break-words">
                    {auditResultLabel(entry.result)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Danh sách nhật ký kiểm toán dạng thẻ" className="grid gap-2 md:hidden">
        {entries.map((entry) => {
          const isSelected = entry.id === selectedId;
          const occurredAt = new Date(entry.occurredAt).toLocaleString();
          const actionLabel = complianceActionLabel(entry.action);
          const objectLabel = objectReferenceLabelFromParts(
            entry.objectType,
            entry.objectCode,
            entry.objectId,
          );

          return (
            <li
              key={entry.id}
              data-selected={isSelected}
              className="min-w-0 rounded-md border p-3 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
            >
              <button
                type="button"
                aria-label={`Mở chi tiết nhật ký kiểm toán ${actionLabel} ${objectLabel} lúc ${occurredAt}, bản ghi ${entry.id}`}
                aria-pressed={isSelected}
                disabled={isSelectionDisabled}
                className="block w-full min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onSelect(entry)}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium">{actionLabel}</span>
                    <span className="text-muted-foreground block break-words text-xs">
                      {objectLabel}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {auditResultLabel(entry.result)}
                  </span>
                </span>
                <span className="text-muted-foreground mt-3 grid gap-1 text-xs">
                  <span className="break-words">
                    Người thực hiện: {actorDisplayName(entry.actorUserId, entry.actorType)}
                  </span>
                  <span className="tabular-nums">{occurredAt}</span>
                  {isSelected && <span className="text-primary font-medium">Đang chọn</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
