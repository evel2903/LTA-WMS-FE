import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';

const metadataToken = (role: Role): number => Date.parse(role.updatedAt);

/**
 * Role metadata and role-permission grants have independent server versions. A response may be
 * newer on one dimension and older on the other, so choosing the whole object by one comparator
 * can roll the other dimension backward.
 */
export function mergeRoleSnapshots(current: Role | undefined, incoming: Role): Role {
  if (!current) return incoming;

  const metadata = metadataToken(incoming) >= metadataToken(current) ? incoming : current;
  return {
    ...metadata,
    permissionsVersion: Math.max(current.permissionsVersion, incoming.permissionsVersion),
  };
}

export function mergeRoleDetailSnapshots(
  current: RoleDetail | undefined,
  incoming: Role | RoleDetail,
): RoleDetail | undefined {
  if (!current) return 'permissions' in incoming ? incoming : undefined;

  const merged = mergeRoleSnapshots(current, incoming);
  const incomingHasNewerPermissions = incoming.permissionsVersion > current.permissionsVersion;
  const incomingHasEqualAuthoritativePermissions =
    incoming.permissionsVersion === current.permissionsVersion && 'permissions' in incoming;

  return {
    ...current,
    ...merged,
    permissions:
      'permissions' in incoming && (incomingHasNewerPermissions || incomingHasEqualAuthoritativePermissions)
        ? incoming.permissions
        : current.permissions,
  };
}
