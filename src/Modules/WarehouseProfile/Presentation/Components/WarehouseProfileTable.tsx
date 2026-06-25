import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';

interface WarehouseProfileTableProps {
  profiles: WarehouseProfile[];
  selectedId: string | null;
  onSelect: (profile: WarehouseProfile) => void;
}

export function WarehouseProfileTable({ profiles, selectedId, onSelect }: WarehouseProfileTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã</TableHead>
          <TableHead>Tên</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Phiên bản</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => (
          <TableRow key={profile.id} data-selected={profile.id === selectedId}>
            <TableCell>
              <button className="underline-offset-2 hover:underline" onClick={() => onSelect(profile)}>
                {profile.profileCode}
              </button>
            </TableCell>
            <TableCell>{profile.profileName}</TableCell>
            <TableCell>{profile.warehouseTypeCode}</TableCell>
            <TableCell className="tabular-nums">{profile.version}</TableCell>
            <TableCell>
              <WarehouseProfileStatusBadge status={profile.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
