import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { AuditLogEntry } from '@modules/Compliance/Domain/Entities/Compliance';

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Thời gian</TableHead>
          <TableHead>Người thực hiện</TableHead>
          <TableHead>Hành động</TableHead>
          <TableHead>Đối tượng</TableHead>
          <TableHead>Kết quả</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow
            key={entry.id}
            data-selected={entry.id === selectedId}
            className="data-[selected=true]:bg-muted"
          >
            <TableCell className="whitespace-nowrap tabular-nums">
              <button
                className="underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSelectionDisabled}
                onClick={() => onSelect(entry)}
              >
                {new Date(entry.occurredAt).toLocaleString()}
              </button>
            </TableCell>
            <TableCell>{entry.actorUserId ?? entry.actorType}</TableCell>
            <TableCell>{entry.action}</TableCell>
            <TableCell>
              {entry.objectType}
              {entry.objectCode ? ` · ${entry.objectCode}` : ''}
            </TableCell>
            <TableCell>{entry.result}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
