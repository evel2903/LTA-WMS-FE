import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { buildPermissionMatrix } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import {
  useAllPermissions,
  useRoleDetails,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';
import { AccessStateView } from '@modules/AccessControl/Presentation/Components/StateViews';
import { RolePermissionMatrix } from '@modules/AccessControl/Presentation/Components/RolePermissionMatrix';
import type { RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';

export function RolePermissionMatrixPage() {
  const store = useAccessControlStore();
  const roleQueries = useRoleDetails();
  const permissionsQuery = useAllPermissions();

  const roleDetails = roleQueries
    .map((query) => query.data)
    .filter((value): value is RoleDetail => Boolean(value));
  const permissions = permissionsQuery.data ?? [];

  const errors = [permissionsQuery.error, ...roleQueries.map((query) => query.error)];
  const apiError = errors.find((error): error is ApiError => error instanceof ApiError) ?? null;
  const isLoading = permissionsQuery.isLoading || roleQueries.some((query) => query.isLoading);

  // Ignore a persisted filter value that is not in the freshly fetched catalog
  // (e.g. after navigation) so the matrix never shows an empty result for a stale select.
  const knownObjectTypes = new Set(permissions.map((permission) => permission.objectType));
  const objectFilter =
    store.objectTypeFilter !== 'ALL' && knownObjectTypes.has(store.objectTypeFilter)
      ? store.objectTypeFilter
      : undefined;
  const matrix = buildPermissionMatrix(roleDetails, permissions, objectFilter);

  const listState = apiError?.isForbidden
    ? 'denied'
    : isLoading
      ? 'loading'
      : apiError
        ? 'error'
        : matrix.rows.length === 0
          ? 'empty'
          : 'ready';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ma trận vai trò và quyền</h1>
        <p className="text-muted-foreground">
          Sáu role lõi V0 và quyền theo action/object (read-only — cấu hình qua seed).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Loại đối tượng<select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={store.objectTypeFilter}
            onChange={(event) => store.setObjectTypeFilter(event.target.value)}
          >
            <option value="ALL">Tất cả</option>
            {matrix.objectTypes.map((objectType) => (
              <option key={objectType} value={objectType}>
                {objectType}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quyền theo vai trò</CardTitle>
        </CardHeader>
        <CardContent>
          {listState === 'ready' ? (
            <RolePermissionMatrix matrix={matrix} />
          ) : (
            <AccessStateView
              state={listState}
              emptyLabel="Không tìm thấy quyền."
              errorMessage={apiError?.message ?? 'Không thể tải ma trận quyền.'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
