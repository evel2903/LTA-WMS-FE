import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import { OverrideControlModeBadge } from '@modules/OverrideLog/Presentation/Components/OverrideControlModeBadge';

interface OverrideLogTableProps {
  logs: OverrideLog[];
  selectedId: string | null;
  onSelect: (log: OverrideLog) => void;
  isSelectionDisabled?: boolean;
}

/** Read-only override log table — no mutate controls (immutable, AC2/AC5). */
export function OverrideLogTable({
  logs,
  selectedId,
  onSelect,
  isSelectionDisabled = false,
}: OverrideLogTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Target object</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Approval ref</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow
            key={log.id}
            data-selected={log.id === selectedId}
            className="data-[selected=true]:bg-muted"
          >
            <TableCell>
              <button
                className="underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSelectionDisabled}
                onClick={() => onSelect(log)}
              >
                {log.ruleCode}
              </button>
            </TableCell>
            <TableCell className="text-muted-foreground">{log.actorUserId}</TableCell>
            <TableCell>
              {log.targetObjectType} · {log.targetObjectCode ?? log.targetObjectId}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {log.reasonNote ?? log.reasonCodeId ?? '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">{log.approvalRequestId ?? '—'}</TableCell>
            <TableCell>
              <OverrideControlModeBadge mode={log.controlMode} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
              {new Date(log.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
