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
    <>
      <div className="hidden min-w-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã hồ sơ</TableHead>
              <TableHead>Tên hồ sơ</TableHead>
              <TableHead>Loại vị trí</TableHead>
              <TableHead>Phiên bản</TableHead>
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
      </div>
      <div className="grid min-w-0 gap-3 md:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-selected={selectedId === item.id}
            className={cn(
              'bg-card text-card-foreground grid min-w-0 gap-3 rounded-md border p-4 text-left shadow-sm',
              selectedId === item.id ? 'border-primary bg-muted/60' : '',
            )}
            onClick={() => onSelect(item)}
          >
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="grid min-w-0 gap-1">
                <span className="text-primary truncate font-semibold">{item.profileCode}</span>
                <span className="text-muted-foreground truncate text-sm">{item.profileName}</span>
              </span>
              <LocationProfileStatusBadge status={item.status} />
            </span>
            <span className="grid grid-cols-2 gap-3 text-sm">
              <span className="grid min-w-0 gap-1">
                <span className="text-muted-foreground text-xs">Loại vị trí</span>
                <span className="truncate font-medium">{item.locationType}</span>
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="text-muted-foreground text-xs">Phiên bản</span>
                <span className="font-medium">{item.version}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
