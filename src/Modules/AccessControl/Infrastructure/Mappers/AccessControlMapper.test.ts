import { describe, expect, it } from 'vitest';

import { AccessControlMapper } from '@modules/AccessControl/Infrastructure/Mappers/AccessControlMapper';
import type {
  PagedDto,
  RoleDto,
  UserDto,
} from '@modules/AccessControl/Infrastructure/Dtos/AccessControlDtos';

describe('AccessControlMapper', () => {
  it('toPaged maps Items + Meta into the camelCase PaginatedResponse', () => {
    const dto: PagedDto<UserDto> = {
      Items: [{ Id: 'u1', FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.c', CreatedAt: 'now' }],
      Meta: { Page: 2, PageSize: 20, TotalItems: 21, TotalPages: 2 },
    };
    const result = AccessControlMapper.toPaged(dto, (item) => AccessControlMapper.toUser(item));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].email).toBe('a@b.c');
    expect(result).toMatchObject({ page: 2, pageSize: 20, totalItems: 21, totalPages: 2 });
  });

  it('toPaged null-guards a malformed/empty envelope', () => {
    const result = AccessControlMapper.toPaged(
      {} as PagedDto<UserDto>,
      (item) => AccessControlMapper.toUser(item),
    );
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });

  it('toRole maps the header shape including id (RA-03) and permissionsVersion (RA-04)', () => {
    const dto: RoleDto = {
      Id: 'r1',
      RoleCode: 'CUSTOM_ROLE',
      RoleName: 'Custom Role',
      Description: 'A custom role',
      IsSystem: false,
      Status: 'ACTIVE',
      PermissionsVersion: 3,
    };
    expect(AccessControlMapper.toRole(dto)).toEqual({
      id: 'r1',
      roleCode: 'CUSTOM_ROLE',
      roleName: 'Custom Role',
      description: 'A custom role',
      isSystem: false,
      status: 'ACTIVE',
      permissionsVersion: 3,
    });
  });

  it('toCreateRoleRequest maps to PascalCase and strips an absent description', () => {
    expect(
      AccessControlMapper.toCreateRoleRequest({ roleCode: 'CUSTOM_ROLE', roleName: 'Custom Role' }),
    ).toEqual({ RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom Role' });

    const withDescription = AccessControlMapper.toCreateRoleRequest({
      roleCode: 'CUSTOM_ROLE',
      roleName: 'Custom Role',
      description: 'A custom role',
    });
    expect(withDescription).toEqual({
      RoleCode: 'CUSTOM_ROLE',
      RoleName: 'Custom Role',
      Description: 'A custom role',
    });
  });

  it('toRoleDetail maps permissions (and defaults to [] when absent)', () => {
    const withPerms: RoleDto = {
      Id: 'r1',
      RoleCode: 'QC',
      RoleName: 'QC',
      Description: null,
      IsSystem: true,
      Status: 'ACTIVE',
      PermissionsVersion: 0,
      Permissions: [{ Id: 'p1', PermissionCode: 'QC.READ.SKU', Action: 'Read', ObjectType: 'SKU', Description: null }],
    };
    expect(AccessControlMapper.toRoleDetail(withPerms).permissions).toHaveLength(1);

    const noPerms: RoleDto = { ...withPerms, Permissions: undefined };
    expect(AccessControlMapper.toRoleDetail(noPerms).permissions).toEqual([]);
  });

  it('toAssignDataScopeRequest strips nullish but keeps includeAll=false', () => {
    const withValue = AccessControlMapper.toAssignDataScopeRequest({
      scopeType: 'WAREHOUSE',
      scopeValueCode: 'WH-01',
      scopeValueId: undefined,
      includeAll: false,
    });
    expect(withValue).toEqual({ ScopeType: 'WAREHOUSE', ScopeValueCode: 'WH-01', IncludeAll: false });
    expect('ScopeValueId' in withValue).toBe(false);

    const includeAll = AccessControlMapper.toAssignDataScopeRequest({
      scopeType: 'OWNER',
      includeAll: true,
    });
    expect(includeAll).toEqual({ ScopeType: 'OWNER', IncludeAll: true });
  });

  it('toEffectivePermissions maps roles + permissions', () => {
    const result = AccessControlMapper.toEffectivePermissions({
      UserId: 'u1',
      Roles: ['WMS_ADMIN'],
      Permissions: [{ Action: 'Read', ObjectType: 'SKU', PermissionCode: 'X' }],
    });
    expect(result.roles).toEqual(['WMS_ADMIN']);
    expect(result.permissions[0]).toEqual({ action: 'Read', objectType: 'SKU', permissionCode: 'X' });
  });

  it('toSetRolePermissionsRequest maps to lower-camel, includes version (RA-04 review), and strips an absent reasonNote', () => {
    expect(
      AccessControlMapper.toSetRolePermissionsRequest({
        permissions: [{ action: 'Update', objectType: 'SKU' }],
        version: 0,
        reasonCode: 'RC-ROLE-PERMISSION-UPDATE',
      }),
    ).toEqual({
      permissions: [{ action: 'Update', objectType: 'SKU' }],
      version: 0,
      reasonCode: 'RC-ROLE-PERMISSION-UPDATE',
    });

    const withNote = AccessControlMapper.toSetRolePermissionsRequest({
      permissions: [],
      version: 2,
      reasonCode: 'RC-ROLE-PERMISSION-UPDATE',
      reasonNote: 'note',
    });
    expect(withNote).toEqual({
      permissions: [],
      version: 2,
      reasonCode: 'RC-ROLE-PERMISSION-UPDATE',
      reasonNote: 'note',
    });
  });

  it('toResetRolePermissionsRequest maps to lower-camel and strips an absent reasonNote (RA-04)', () => {
    expect(
      AccessControlMapper.toResetRolePermissionsRequest({ reasonCode: 'RC-ROLE-PERMISSION-UPDATE' }),
    ).toEqual({ reasonCode: 'RC-ROLE-PERMISSION-UPDATE' });
  });

  it('toEffectivePermissionsResult maps the lower-camel permissions + version response (defaults permissions to [] when absent, RA-04)', () => {
    expect(
      AccessControlMapper.toEffectivePermissionsResult({
        permissions: [{ action: 'Update', objectType: 'SKU' }],
        version: 1,
      }),
    ).toEqual({ permissions: [{ action: 'Update', objectType: 'SKU' }], version: 1 });

    expect(
      AccessControlMapper.toEffectivePermissionsResult({ permissions: undefined as never, version: 0 }),
    ).toEqual({ permissions: [], version: 0 });
  });
});
