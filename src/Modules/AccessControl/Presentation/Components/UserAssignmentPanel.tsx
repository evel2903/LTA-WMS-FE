import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import type {
  EffectivePermissions,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import {
  CORE_ROLE_CODES,
  DATA_SCOPE_LABELS,
  ROLE_LABELS,
  type RoleCode,
} from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { AssignRoleForm } from '@modules/AccessControl/Presentation/Forms/AssignRoleForm';
import { AssignDataScopeForm } from '@modules/AccessControl/Presentation/Forms/AssignDataScopeForm';

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
  effective?: EffectivePermissions;
  dataScopes: UserDataScope[];
  canManage: boolean;
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
  effective,
  dataScopes,
  canManage,
  pending,
  conflicts,
  onAssignRole,
  onRemoveRole,
  onAssignScope,
  onRemoveScope,
}: UserAssignmentPanelProps) {
  const assignedRoles = effective?.roles ?? [];
  const availableRoles = CORE_ROLE_CODES.filter((role) => !assignedRoles.includes(role));
  const permissionCount = effective?.permissions.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {`${user.firstName} ${user.lastName}`.trim() || user.email}
        </h2>
        <p className="text-muted-foreground text-sm">{user.email}</p>
        {!canManage && (
          <p className="text-muted-foreground mt-1 text-xs">Read only — bạn không có quyền chỉnh.</p>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Roles</h3>
        {assignedRoles.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa gán role nào.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {assignedRoles.map((role) => (
              <li key={role}>
                <Badge variant="secondary" className="gap-2">
                  {ROLE_LABELS[role]}
                  {canManage && (
                    <button
                      aria-label={`Gỡ role ${ROLE_LABELS[role]}`}
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
        {canManage && (
          <AssignRoleForm
            // Remount when the available set changes (after assign/remove) so the
            // default selection re-seeds to a still-valid role — avoids a stale submit.
            key={availableRoles.join('|') || 'none'}
            availableRoles={availableRoles}
            pending={pending.assignRole}
            conflict={conflicts.role}
            onSubmit={onAssignRole}
          />
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Data scope</h3>
        {dataScopes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa gán data scope nào.</p>
        ) : (
          <ul className="space-y-1">
            {dataScopes.map((scope) => (
              <li key={scope.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{DATA_SCOPE_LABELS[scope.scopeType]}</Badge>
                <span className="text-muted-foreground">{scopeValueLabel(scope)}</span>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
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
        <h3 className="text-sm font-medium">Effective permissions ({permissionCount})</h3>
        {permissionCount === 0 ? (
          <p className="text-muted-foreground text-sm">Không có permission hiệu lực.</p>
        ) : (
          <ul className="text-muted-foreground grid max-h-40 grid-cols-2 gap-x-4 overflow-y-auto text-xs">
            {effective?.permissions.map((permission) => (
              <li key={permission.permissionCode}>
                {permission.action} · {permission.objectType}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
