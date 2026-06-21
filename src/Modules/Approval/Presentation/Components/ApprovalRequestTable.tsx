import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import { ApprovalDecisionBadge } from '@modules/Approval/Presentation/Components/ApprovalDecisionBadge';

interface ApprovalRequestTableProps {
  items: ApprovalRequest[];
  selectedId: string | null;
  onSelect: (item: ApprovalRequest) => void;
}

export function ApprovalRequestTable({ items, selectedId, onSelect }: ApprovalRequestTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Created</TableHead>
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
                {item.targetObjectType} · {item.targetObjectCode ?? item.targetObjectId}
              </button>
            </TableCell>
            <TableCell>{item.action}</TableCell>
            <TableCell className="text-muted-foreground">{item.requesterUserId}</TableCell>
            <TableCell>
              <ApprovalDecisionBadge decision={item.decision} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.decisionNote ?? item.requestReasonNote ?? '—'}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {new Date(item.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
