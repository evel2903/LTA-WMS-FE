import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';
import { ExceptionStateBadge } from '@modules/Compliance/Presentation/Components/ExceptionStateBadge';

interface ExceptionTableProps {
  cases: ExceptionCase[];
  selectedId: string | null;
  onSelect: (item: ExceptionCase) => void;
}

export function ExceptionTable({ cases, selectedId, onSelect }: ExceptionTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>State</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Object reference</TableHead>
          <TableHead>Severity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((item) => (
          <TableRow
            key={item.id}
            data-selected={item.id === selectedId}
            className="data-[selected=true]:bg-muted"
          >
            <TableCell>
              <ExceptionStateBadge state={item.state} />
            </TableCell>
            <TableCell>
              <button className="underline-offset-2 hover:underline" onClick={() => onSelect(item)}>
                {item.exceptionType}
              </button>
            </TableCell>
            <TableCell>{item.assignedToUserId ?? item.assignedRoleId ?? '—'}</TableCell>
            <TableCell>{item.reasonCodeId ?? '—'}</TableCell>
            <TableCell>
              {item.referenceType} · {item.referenceId}
            </TableCell>
            <TableCell>{item.severity}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
