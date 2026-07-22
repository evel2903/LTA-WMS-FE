import { describe, expect, it } from 'vitest';

import {
  buildPermissionMatrix,
  matrixCellKey,
} from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import type { Permission, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';

const perm = (action: string, objectType: string): Permission => ({
  id: `${action}-${objectType}`,
  permissionCode: `${objectType}.${action}`,
  action,
  objectType,
  description: null,
});

const adminRole: RoleDetail = {
  id: 'role-wms-admin',
  roleCode: 'WMS_ADMIN',
  roleName: 'Admin',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
  updatedAt: '2026-07-22T06:00:00.000Z',
  permissions: [perm('Read', 'SKU'), perm('Create', 'SKU')],
};

const qcRole: RoleDetail = {
  id: 'role-qc',
  roleCode: 'QC',
  roleName: 'QC',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
  updatedAt: '2026-07-22T06:00:00.000Z',
  permissions: [perm('Read', 'SKU')],
};

const catalog = [perm('Read', 'SKU'), perm('Create', 'SKU'), perm('Read', 'Owner')];

describe('buildPermissionMatrix', () => {
  it('derives distinct (object, action) rows + sorted object types from the catalog', () => {
    const matrix = buildPermissionMatrix([adminRole, qcRole], catalog);
    expect(matrix.rows).toHaveLength(3);
    expect(matrix.objectTypes).toEqual(['Owner', 'SKU']);
  });

  it('marks a cell granted only when that role holds the (action, object) permission', () => {
    const matrix = buildPermissionMatrix([adminRole, qcRole], catalog);
    expect(matrix.grants.has(matrixCellKey('WMS_ADMIN', 'Create', 'SKU'))).toBe(true);
    expect(matrix.grants.has(matrixCellKey('QC', 'Create', 'SKU'))).toBe(false);
    expect(matrix.grants.has(matrixCellKey('QC', 'Read', 'SKU'))).toBe(true);
  });

  it('filters rows to a single object type but keeps the full object-type list', () => {
    const matrix = buildPermissionMatrix([adminRole, qcRole], catalog, 'Owner');
    expect(matrix.rows).toEqual([{ action: 'Read', objectType: 'Owner' }]);
    expect(matrix.objectTypes).toEqual(['Owner', 'SKU']);
  });
});
