import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  PermissionListFilter,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';

export const accessControlQueryKeys = {
  all: [QUERY_NAMESPACES.ACCESS_CONTROL] as const,
  roleDetail: (roleCode: RoleCode) => [...accessControlQueryKeys.all, 'role', roleCode] as const,
  permissions: (filter?: PermissionListFilter) =>
    [...accessControlQueryKeys.all, 'permissions', filter ?? {}] as const,
  users: (filter?: UserListFilter) => [...accessControlQueryKeys.all, 'users', filter ?? {}] as const,
  userEffective: (userId: string) => [...accessControlQueryKeys.all, 'effective', userId] as const,
  userDataScopes: (userId: string) => [...accessControlQueryKeys.all, 'dataScopes', userId] as const,
};
