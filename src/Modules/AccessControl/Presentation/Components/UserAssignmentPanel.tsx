import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import type {
  EffectivePermissions,
  Role,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { AssignRoleForm } from '@modules/AccessControl/Presentation/Forms/AssignRoleForm';
import { AssignDataScopeForm } from '@modules/AccessControl/Presentation/Forms/AssignDataScopeForm';
import {
  dataScopeTypeLabel,
  permissionActionObjectLabel,
} from '@modules/AccessControl/Presentation/Constants/AccessControlDisplayText';

interface PendingFlags {
  assignRole: boolean;
  removeRole: boolean;
  assignScope: boolean;
  removeScope: boolean;
}

interface ConflictMessages {
  role?: string;
  scope?: string;
}

interface UserAssignmentPanelProps {
  user: UserSummary;
  /** Full role catalog (RA-05) — dynamic, not the old hardcoded 6-core-role set, so a
   * custom role created via RolesMasterPage can be selected too. Used for BOTH label lookups
   * (including roles that later became inactive) and, once Active-filtered below, assignment
   * options. */
  roles: Role[];
  /** Catalog fetch state — gates the assign-role form so it never claims "none available"
   * while the catalog is still loading or failed to load (Review Finding). */
  rolesStatus: 'loading' | 'error' | 'unconfirmed' | 'ready';
  effective?: EffectivePermissions;
  /** Role codes with a just-succeeded, not-yet-removed assignment for this user — excluded
   * from `availableRoles` to close the gap between a successful assign and the effective-
   * permissions refetch landing (Review Finding, round 9), without depending on the mutation
   * cache's own GC timing to know when that reservation should end (Review Finding, round 11:
   * lifted from `useAccessControlMutations()`'s own local state instead). */
  reservedRoleCodes: string[];
  dataScopes: UserDataScope[];
  canManage: boolean;
  readOnlyMessage?: string;
  pending: PendingFlags;
  conflicts: ConflictMessages;
  onAssignRole: (input: AssignRoleInput) => void;
  onRemoveRole: (roleCode: RoleCode) => void;
  onAssignScope: (input: AssignDataScopeInput) => void;
  onRemoveScope: (scopeId: string) => void;
}

function scopeValueLabel(scope: UserDataScope): string {
  if (scope.includeAll) return 'Tất cả';
  return scope.scopeValueCode ?? scope.scopeValueId ?? '—';
}

export function UserAssignmentPanel({
  user,
  roles,
  rolesStatus,
  effective,
  reservedRoleCodes,
  dataScopes,
  canManage,
  readOnlyMessage = 'Bạn không có quyền chỉnh sửa phân quyền của người dùng này.',
  pending,
  conflicts,
  onAssignRole,
  onRemoveRole,
  onAssignScope,
  onRemoveScope,
}: UserAssignmentPanelProps) {
  const assignedRoles = effective?.roles ?? [];
  // Active-only for what's selectable (RA-05 Decision #4) — `roles` itself stays the full
  // catalog so `roleNameByCode` below still resolves an assigned role that later went inactive.
  const availableRoles = roles.filter(
    (role) =>
      role.status === 'ACTIVE' &&
      !assignedRoles.includes(role.roleCode) &&
      !reservedRoleCodes.includes(role.roleCode),
  );
  const permissionCount = effective?.permissions.length ?? 0;
  const roleNameByCode = new Map(roles.map((role) => [role.roleCode, role.roleName]));
  // Falls back to the raw code (never blank/"undefined") — a role can be assigned but no
  // longer appear in `roles` if it was deactivated after assignment (RA-05 AC1).
  const roleLabel = (roleCode: string) => roleNameByCode.get(roleCode) ?? roleCode;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {`${user.firstName} ${user.lastName}`.trim() || user.email}
        </h2>
        <p className="text-muted-foreground break-all text-sm">{user.email}</p>
        {!canManage && (
          <Alert variant="warning" role="status" className="mt-2">
            <AlertTitle>Chế độ chỉ đọc</AlertTitle>
            <AlertDescription>{readOnlyMessage}</AlertDescription>
          </Alert>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Vai trò</h3>
        {assignedRoles.length === 0 ? (
          <Alert variant="info" role="status">
            <AlertDescription>Chưa gán vai trò nào.</AlertDescription>
          </Alert>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {assignedRoles.map((role) => (
              <li key={role}>
                <Badge variant="secondary" className="max-w-full gap-2 whitespace-normal break-words">
                  <span className="min-w-0 break-words">{roleLabel(role)}</span>
                  {canManage && rolesStatus === 'ready' && (
                    <button
                      aria-label={`Gỡ vai trò ${roleLabel(role)}`}
                      className="text-destructive"
                      disabled={pending.removeRole}
                      onClick={() => onRemoveRole(role)}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {rolesStatus === 'loading' && (
          <Alert variant="info" role="status">
            <AlertDescription>Đang tải danh sách vai trò...</AlertDescription>
          </Alert>
        )}
        {rolesStatus === 'error' && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>Không thể tải danh sách vai trò để gán. Thử tải lại trang.</AlertDescription>
          </Alert>
        )}
        {rolesStatus === 'unconfirmed' && (
          <Alert variant="warning" role="status">
            <AlertTitle>Danh mục vai trò chưa được xác nhận</AlertTitle>
            <AlertDescription>
              Đang dùng bản đầy đủ gần nhất để hiển thị nhãn. Tạm khóa thao tác gán và gỡ vai trò cho đến khi tải lại thành công.
            </AlertDescription>
          </Alert>
        )}
        {canManage && rolesStatus === 'ready' && (
          // No remount-on-change `key` here (Review Finding) — `AssignRoleForm` now stays
          // mounted across a catalog refresh and reseeds its own selection only when the
          // currently-selected role actually stops being valid, preserving an in-progress
          // pick of a non-first option instead of silently resetting to option 1.
          <AssignRoleForm
            availableRoles={availableRoles}
            pending={pending.assignRole}
            conflict={conflicts.role}
            onSubmit={onAssignRole}
          />
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Phạm vi dữ liệu</h3>
        {dataScopes.length === 0 ? (
          <Alert variant="info" role="status">
            <AlertDescription>Chưa gán phạm vi dữ liệu nào.</AlertDescription>
          </Alert>
        ) : (
          <ul className="space-y-2">
            {dataScopes.map((scope) => (
              <li key={scope.id} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="max-w-full whitespace-normal break-words">
                  {dataScopeTypeLabel(scope.scopeType)}
                </Badge>
                <span className="text-muted-foreground min-w-0 break-all">{scopeValueLabel(scope)}</span>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Gỡ phạm vi ${dataScopeTypeLabel(scope.scopeType)} ${scopeValueLabel(scope)}`}
                    disabled={pending.removeScope}
                    onClick={() => onRemoveScope(scope.id)}
                  >
                    Gỡ
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <AssignDataScopeForm
            // Remount after add/remove to clear the inputs back to defaults.
            key={`scopes-${dataScopes.length}`}
            pending={pending.assignScope}
            conflict={conflicts.scope}
            onSubmit={onAssignScope}
          />
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Quyền hiệu lực ({permissionCount})</h3>
        {permissionCount === 0 ? (
          <Alert variant="info" role="status">
            <AlertDescription>Không có quyền hiệu lực.</AlertDescription>
          </Alert>
        ) : (
          <ul className="text-muted-foreground grid max-h-40 grid-cols-1 gap-2 overflow-y-auto text-xs sm:grid-cols-2">
            {effective?.permissions.map((permission) => (
              <li key={permission.permissionCode} className="min-w-0 break-words">
                {permissionActionObjectLabel(permission.action, permission.objectType)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
