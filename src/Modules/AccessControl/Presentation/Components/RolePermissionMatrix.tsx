import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { Badge } from '@shared/Components/Ui/Badge';
import { CORE_ROLE_CODES, ROLE_LABELS } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import {
  matrixCellKey,
  type PermissionMatrix,
} from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import {
  actionLabel,
  objectTypeLabel,
  permissionActionObjectLabel,
} from '@modules/AccessControl/Presentation/Constants/AccessControlDisplayText';

interface RolePermissionMatrixProps {
  matrix: PermissionMatrix;
}

/** Read-only matrix: rows = (object, action), columns = the six core roles. */
export function RolePermissionMatrix({ matrix }: RolePermissionMatrixProps) {
  return (
    <div className="min-w-0">
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Đối tượng</TableHead>
              <TableHead>Hành động</TableHead>
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
                <TableCell className="max-w-48 whitespace-normal break-words font-medium">
                  {objectTypeLabel(row.objectType)}
                </TableCell>
                <TableCell className="whitespace-normal break-words">{actionLabel(row.action)}</TableCell>
                {CORE_ROLE_CODES.map((role) => {
                  const granted = matrix.grants.has(matrixCellKey(role, row.action, row.objectType));
                  return (
                    <TableCell key={role} className="text-center">
                      <span
                        aria-label={
                          granted
                            ? `${ROLE_LABELS[role]} có quyền ${permissionActionObjectLabel(row.action, row.objectType)}`
                            : `${ROLE_LABELS[role]} không có quyền ${permissionActionObjectLabel(row.action, row.objectType)}`
                        }
                        className={
                          granted
                            ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                            : 'text-muted-foreground inline-flex rounded-full bg-muted px-2 py-0.5 text-xs'
                        }
                      >
                        {granted ? 'Có' : 'Không'}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {matrix.rows.map((row) => {
          return (
            <article
              key={`${row.objectType}::${row.action}`}
              className="border-border bg-card text-card-foreground min-w-0 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm font-medium">{objectTypeLabel(row.objectType)}</p>
                <p className="text-muted-foreground break-words text-xs">{actionLabel(row.action)}</p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CORE_ROLE_CODES.map((role) => {
                  const granted = matrix.grants.has(matrixCellKey(role, row.action, row.objectType));
                  return (
                    <Badge
                      key={role}
                      variant={granted ? 'success' : 'outline'}
                      aria-label={
                        granted
                          ? `${ROLE_LABELS[role]} có quyền ${permissionActionObjectLabel(row.action, row.objectType)}`
                          : `${ROLE_LABELS[role]} không có quyền ${permissionActionObjectLabel(row.action, row.objectType)}`
                      }
                      className="max-w-full justify-start whitespace-normal break-words"
                    >
                      {ROLE_LABELS[role]}: {granted ? 'Có' : 'Không'}
                    </Badge>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
