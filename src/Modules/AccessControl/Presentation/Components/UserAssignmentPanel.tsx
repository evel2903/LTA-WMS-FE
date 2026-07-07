import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import type {
  EffectivePermissions,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import {
  CORE_ROLE_CODES,
  ROLE_LABELS,
  type RoleCode,
} from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
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
  effective?: EffectivePermissions;
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
  effective,
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
  const availableRoles = CORE_ROLE_CODES.filter((role) => !assignedRoles.includes(role));
  const permissionCount = effective?.permissions.length ?? 0;

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
                  <span className="min-w-0 break-words">{ROLE_LABELS[role]}</span>
                  {canManage && (
                    <button
                      aria-label={`Gỡ vai trò ${ROLE_LABELS[role]}`}
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
