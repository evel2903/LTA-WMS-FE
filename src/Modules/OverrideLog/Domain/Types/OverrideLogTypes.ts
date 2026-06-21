import type { ObjectType } from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';

/**
 * Whitelisted query filter for `GET /overrides` (PascalCase on the wire). No warehouse/owner
 * param — data-scope filtering (AC3) is enforced server-side by the PermissionGuard.
 */
export interface OverrideLogFilter {
  page?: number;
  pageSize?: number;
  ruleId?: string;
  actorUserId?: string;
  targetObjectType?: ObjectType;
  targetObjectId?: string;
  from?: string;
  to?: string;
}
