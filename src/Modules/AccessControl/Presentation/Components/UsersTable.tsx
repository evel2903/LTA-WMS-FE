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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} data-selected={user.id === selectedId}>
            <TableCell>
              <button
                className="underline-offset-2 hover:underline"
                onClick={() => onSelect(user)}
              >
                {`${user.firstName} ${user.lastName}`.trim() || user.email}
              </button>
            </TableCell>
            <TableCell className="text-muted-foreground">{user.email}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
