import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { CORE_ROLE_CODES, ROLE_LABELS } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import {
  matrixCellKey,
  type PermissionMatrix,
} from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';

interface RolePermissionMatrixProps {
  matrix: PermissionMatrix;
}

/** Read-only matrix: rows = (object, action), columns = the six core roles. */
export function RolePermissionMatrix({ matrix }: RolePermissionMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Object</TableHead>
            <TableHead>Action</TableHead>
            {CORE_ROLE_CODES.map((role) => (
              <TableHead key={role} className="text-center">
                {ROLE_LABELS[role]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.rows.map((row) => (
            <TableRow key={`${row.objectType}::${row.action}`}>
              <TableCell className="font-medium">{row.objectType}</TableCell>
              <TableCell>{row.action}</TableCell>
              {CORE_ROLE_CODES.map((role) => {
                const granted = matrix.grants.has(matrixCellKey(role, row.action, row.objectType));
                return (
                  <TableCell key={role} className="text-center">
                    <span
                      aria-label={
                        granted
                          ? `${ROLE_LABELS[role]} có quyền ${row.action} ${row.objectType}`
                          : `${ROLE_LABELS[role]} không có quyền ${row.action} ${row.objectType}`
                      }
                      className={granted ? 'text-emerald-600' : 'text-muted-foreground/40'}
                    >
                      {granted ? '✓' : '·'}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
