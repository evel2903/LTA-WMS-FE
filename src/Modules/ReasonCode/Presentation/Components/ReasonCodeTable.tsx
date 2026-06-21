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
import { REASON_GROUP_LABELS } from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

interface ReasonCodeTableProps {
  items: ReasonCode[];
  selectedId: string | null;
  onSelect: (item: ReasonCode) => void;
}

export function ReasonCodeTable({ items, selectedId, onSelect }: ReasonCodeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Applies to action</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Evidence</TableHead>
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
                {item.reasonCode}
              </button>
            </TableCell>
            <TableCell>{REASON_GROUP_LABELS[item.reasonGroup]}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {item.appliesToActions.join(', ')}
            </TableCell>
            <TableCell>
              <Badge variant={item.status === 'ACTIVE' ? 'success' : 'outline'}>{item.status}</Badge>
            </TableCell>
            <TableCell className="tabular-nums">{item.version}</TableCell>
            <TableCell>{item.evidenceRequired ? 'Required' : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
