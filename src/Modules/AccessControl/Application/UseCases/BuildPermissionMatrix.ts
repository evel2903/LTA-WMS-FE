import type { Permission, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

export interface MatrixRow {
  action: string;
  objectType: string;
}

export interface PermissionMatrix {
  rows: MatrixRow[];
  /** Membership keys `${roleCode}::${action}::${objectType}` for granted cells. */
  grants: Set<string>;
  /** Distinct object types present (for the object filter dropdown). */
  objectTypes: string[];
}

export const matrixCellKey = (roleCode: RoleCode, action: string, objectType: string): string =>
  `${roleCode}::${action}::${objectType}`;

/**
 * Pure projection: builds the role-permission matrix from the permission catalog
 * (rows = distinct action×object pairs) and each role's granted permissions
 * (grant set). Optionally filters rows to a single object type. No data fetching,
 * so it is unit-testable in isolation.
 */
export function buildPermissionMatrix(
  roleDetails: RoleDetail[],
  permissions: Permission[],
  objectFilter?: string,
): PermissionMatrix {
  const objectTypes = [...new Set(permissions.map((p) => p.objectType))].sort((a, b) =>
    a.localeCompare(b),
  );

  const rowKey = (action: string, objectType: string) => `${objectType}::${action}`;
  const rowMap = new Map<string, MatrixRow>();
  for (const permission of permissions) {
    if (objectFilter && permission.objectType !== objectFilter) continue;
    const key = rowKey(permission.action, permission.objectType);
    if (!rowMap.has(key)) rowMap.set(key, { action: permission.action, objectType: permission.objectType });
  }
  const rows = [...rowMap.values()].sort(
    (a, b) => a.objectType.localeCompare(b.objectType) || a.action.localeCompare(b.action),
  );

  const grants = new Set<string>();
  for (const role of roleDetails) {
    for (const permission of role.permissions) {
      grants.add(matrixCellKey(role.roleCode, permission.action, permission.objectType));
    }
  }

  return { rows, grants, objectTypes };
}
