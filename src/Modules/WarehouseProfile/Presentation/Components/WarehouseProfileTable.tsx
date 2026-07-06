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

export function WarehouseProfileTable({
  profiles,
  selectedId,
  onSelect,
}: WarehouseProfileTableProps) {
  return (
    <div className="space-y-3">
      <div className="hidden md:block">
        <Table aria-label="Danh sách hồ sơ kho dạng bảng" className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%]">Mã</TableHead>
              <TableHead className="w-[34%]">Tên</TableHead>
              <TableHead className="w-[18%]">Loại</TableHead>
              <TableHead className="w-[12%]">Phiên bản</TableHead>
              <TableHead className="w-[14%]">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => {
              const isSelected = profile.id === selectedId;
              return (
                <TableRow
                  key={profile.id}
                  data-selected={isSelected}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  <TableCell className="min-w-0 whitespace-normal break-words">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className="min-w-0 break-words text-left underline-offset-2 hover:underline"
                      onClick={() => onSelect(profile)}
                    >
                      {profile.profileCode}
                    </button>
                    {isSelected && (
                      <span className="text-primary mt-1 block text-xs font-medium">Đang chọn</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-0 whitespace-normal break-words">
                    {profile.profileName}
                  </TableCell>
                  <TableCell className="min-w-0 whitespace-normal break-words">
                    {profile.warehouseTypeCode}
                  </TableCell>
                  <TableCell className="whitespace-normal tabular-nums">
                    {profile.version}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <WarehouseProfileStatusBadge status={profile.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Danh sách hồ sơ kho dạng thẻ" className="grid gap-2 md:hidden">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedId;
          return (
            <li
              key={profile.id}
              data-selected={isSelected}
              className="rounded-md border p-3 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
            >
              <button
                type="button"
                aria-pressed={isSelected}
                className="block w-full min-w-0 text-left"
                onClick={() => onSelect(profile)}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium">{profile.profileCode}</span>
                    <span className="text-muted-foreground block break-words text-sm">
                      {profile.profileName}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <WarehouseProfileStatusBadge status={profile.status} />
                  </span>
                </span>
                <span className="text-muted-foreground mt-3 grid gap-1 text-sm">
                  <span className="min-w-0 break-words">Loại: {profile.warehouseTypeCode}</span>
                  <span className="tabular-nums">Phiên bản: {profile.version}</span>
                  {isSelected && (
                    <span className="text-primary text-xs font-medium">Đang chọn</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
