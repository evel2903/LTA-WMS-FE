import { cn } from '@shared/Utils/Cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { LocationProfileStatusBadge } from '@modules/MasterData/Presentation/Components/LocationProfileStatusBadge';

interface LocationProfileTableProps {
  items: LocationProfile[];
  selectedId: string | null;
  onSelect: (item: LocationProfile) => void;
}

export function LocationProfileTable({ items, selectedId, onSelect }: LocationProfileTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã hồ sơ</TableHead>
          <TableHead>Tên hồ sơ</TableHead>
          <TableHead>Loại vị trí</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            aria-selected={selectedId === item.id}
            className={cn(selectedId === item.id ? 'bg-muted/60' : '')}
            onClick={() => onSelect(item)}
          >
            <TableCell>
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(item);
                }}
              >
                {item.profileCode}
              </button>
            </TableCell>
            <TableCell>{item.profileName}</TableCell>
            <TableCell>{item.locationType}</TableCell>
            <TableCell>{item.version}</TableCell>
            <TableCell>
              <LocationProfileStatusBadge status={item.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
