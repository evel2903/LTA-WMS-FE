import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { GovernanceStateBanner } from '@shared/Components/Page/GovernanceStateBanner';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { buildPermissionMatrix } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import {
  useAllPermissions,
  useRoleDetails,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';
import { RolePermissionMatrix } from '@modules/AccessControl/Presentation/Components/RolePermissionMatrix';
import { objectTypeLabel } from '@modules/AccessControl/Presentation/Constants/AccessControlDisplayText';
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
  const firstError = errors.find((error) => Boolean(error)) ?? null;
  const apiError = errors.find((error): error is ApiError => error instanceof ApiError) ?? null;
  const errorMessage =
    firstError instanceof Error ? firstError.message : 'Không thể tải ma trận quyền.';
  const isLoading = permissionsQuery.isLoading || roleQueries.some((query) => query.isLoading);

  // Ignore a persisted filter value that is not in the freshly fetched catalog
  // (e.g. after navigation) so the matrix never shows an empty result for a stale select.
  const knownObjectTypes = new Set(permissions.map((permission) => permission.objectType));
  const objectFilter =
    store.objectTypeFilter !== 'ALL' && knownObjectTypes.has(store.objectTypeFilter)
      ? store.objectTypeFilter
      : undefined;
  const objectFilterValue = objectFilter ?? 'ALL';
  const matrix = buildPermissionMatrix(roleDetails, permissions, objectFilter);

  const listState: PageBoundaryState | null = apiError?.isForbidden
    ? 'forbidden'
    : isLoading
      ? 'loading'
      : firstError
        ? 'error'
        : matrix.rows.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Ma trận vai trò và quyền"
      description="Rà soát sáu vai trò lõi V0 theo quyền hành động và loại đối tượng. Màn hình này chỉ đọc và phản ánh dữ liệu RBAC backend trả về."
      filters={
        <label className="grid min-w-64 gap-1 text-sm">
          Loại đối tượng
          <select
            id="role-permission-object-filter"
            name="objectTypeFilter"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={objectFilterValue}
            onChange={(event) => store.setObjectTypeFilter(event.target.value)}
          >
            <option value="ALL">Tất cả</option>
            {matrix.objectTypes.map((objectType) => (
              <option key={objectType} value={objectType}>
                {objectTypeLabel(objectType)}
              </option>
            ))}
          </select>
        </label>
      }
      filtersAriaLabel="Bộ lọc ma trận vai trò và quyền"
      contentAriaLabel="Ma trận quyền theo vai trò"
      state={listState}
      stateTitle={listState === 'forbidden' ? 'Không có quyền xem ma trận' : undefined}
      stateMessage={
        listState === 'loading'
          ? undefined
          : listState === 'empty'
            ? 'Không tìm thấy quyền phù hợp với bộ lọc hiện tại.'
            : errorMessage
      }
    >
      <GovernanceStateBanner
        state="readOnly"
        title="Catalog quyền chỉ đọc"
        message="Vai trò và quyền được lấy từ RBAC backend. Story này chỉ làm mới presentation, không tạo role CRUD hoặc permission editor."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quyền theo vai trò</CardTitle>
        </CardHeader>
        <CardContent>
          <RolePermissionMatrix matrix={matrix} />
        </CardContent>
      </Card>
    </ListPageShell>
  );
}
