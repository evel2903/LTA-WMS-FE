import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { UserSummary } from '@modules/AccessControl/Domain/Entities/AccessControl';

interface UsersTableProps {
  users: UserSummary[];
  selectedId: string | null;
  onSelect: (user: UserSummary) => void;
}

export function UsersTable({ users, selectedId, onSelect }: UsersTableProps) {
  return (
    <div className="min-w-0">
      <div className="hidden md:block">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28 text-right">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
              const selected = user.id === selectedId;

              return (
                <TableRow key={user.id} data-state={selected ? 'selected' : undefined}>
                  <TableCell className="max-w-72 whitespace-normal break-words">
                    <button
                      type="button"
                      aria-label={`Mở chi tiết phân quyền của ${displayName}`}
                      className="text-left font-medium underline-offset-2 hover:underline"
                      onClick={() => onSelect(user)}
                    >
                      {displayName}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-96 whitespace-normal break-all">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-right">
                    {selected ? (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">Đang chọn</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Có thể mở</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {users.map((user) => {
          const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
          const selected = user.id === selectedId;

          return (
            <article key={user.id} className="border-border bg-card text-card-foreground min-w-0 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm font-medium">{displayName}</p>
                <p className="text-muted-foreground break-all text-xs">{user.email}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {selected ? (
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">Đang chọn</span>
                ) : (
                  <span className="text-muted-foreground text-xs">Có thể mở</span>
                )}
                <button
                  type="button"
                  aria-label={`Mở chi tiết phân quyền của ${displayName}`}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium"
                  onClick={() => onSelect(user)}
                >
                  Mở chi tiết
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
