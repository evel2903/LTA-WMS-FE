import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { conflictMessage } from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import {
  useAllRoles,
  useReservedRoleCodes,
  useUserDataScopes,
  useUserEffectivePermissions,
  useUsers,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import type { UserSummary } from '@modules/AccessControl/Domain/Entities/AccessControl';
import { UserAssignmentPanel } from '@modules/AccessControl/Presentation/Components/UserAssignmentPanel';

type UserAssignmentDetailMode = 'detail' | 'edit';

interface UserAssignmentDetailPageProps {
  mode: UserAssignmentDetailMode;
}

function fallbackUser(userId: string): UserSummary {
  return {
    id: userId,
    firstName: '',
    lastName: '',
    email: userId,
    createdAt: '',
  };
}

function detailState(params: {
  userId?: string;
  isLoading: boolean;
  error: unknown;
}): PageBoundaryState | null {
  if (!params.userId) return 'notFound';
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (apiError?.status === 404) return 'notFound';
  if (params.error) return 'error';
  return null;
}

export function UserAssignmentDetailPage({ mode }: UserAssignmentDetailPageProps) {
  const { id } = useParams();
  const [roleError, setRoleError] = useState<unknown>(null);
  const [scopeError, setScopeError] = useState<unknown>(null);
  const userId = id ?? '';
  const isEdit = mode === 'edit';

  const usersQuery = useUsers({ page: 1, pageSize: 100 });
  const rolesQuery = useAllRoles();
  const effectiveQuery = useUserEffectivePermissions(userId || null);
  const dataScopesQuery = useUserDataScopes(userId || null);
  const reservedQuery = useReservedRoleCodes(userId || null);
  const reservedRoleCodes = Object.keys(reservedQuery.data ?? {});
  const mutations = useAccessControlMutations();

  const user = usersQuery.data?.items.find((item) => item.id === userId) ?? fallbackUser(userId);
  // Full catalog (not Active-filtered) so an assigned role that later becomes inactive keeps
  // its real name (Review Finding) — UserAssignmentPanel applies the Active filter itself,
  // only for what's selectable to assign (RA-05 Decision #4: client-side, no BE status param).
  const roleCatalog = rolesQuery.data ?? [];
  // Data-presence-first, not status-string-first (Review Finding): `isLoading` is false while
  // a first fetch is offline-paused (no data yet, but not "fetching" either), and `isError`
  // goes true on a background refetch failure even when older data is still perfectly usable
  // (TanStack Query's `isRefetchError = isError && hasData`). Block only when there is truly
  // no catalog to show yet; a retained stale catalog after a failed refetch still counts as
  // ready.
  const rolesStatus: 'loading' | 'error' | 'ready' =
    rolesQuery.data !== undefined ? 'ready' : rolesQuery.isError ? 'error' : 'loading';
  const detailError =
    (effectiveQuery.error instanceof ApiError ? effectiveQuery.error : null) ??
    (dataScopesQuery.error instanceof ApiError ? dataScopesQuery.error : null);
  const mutationForbidden =
    (roleError instanceof ApiError && roleError.isForbidden) ||
    (scopeError instanceof ApiError && scopeError.isForbidden);
  const canMutate = isEdit && !detailError?.isForbidden && !mutationForbidden;
  const readOnlyMessage = isEdit
    ? 'Bạn không có quyền chỉnh sửa phân quyền của người dùng này.'
    : 'Đang ở chế độ xem chi tiết. Chọn Chỉnh sửa phân quyền để thay đổi vai trò hoặc phạm vi dữ liệu.';
  const state = detailState({
    userId,
    isLoading: effectiveQuery.isLoading || dataScopesQuery.isLoading,
    error: detailError ?? effectiveQuery.error ?? dataScopesQuery.error,
  });

  useEffect(() => {
    setRoleError(null);
    setScopeError(null);
  }, [userId, mode]);

  return (
    <DetailPageShell
      title={`${user.firstName} ${user.lastName}`.trim() || user.email}
      subtitle="Rà soát quyền hiệu lực và phạm vi dữ liệu của người dùng trước khi mở thao tác phân quyền."
      backTo={ROUTES.FOUNDATION.ACCESS.USERS}
      backLabel="Quay lại người dùng"
      actions={
        isEdit ? (
          <Button asChild variant="outline">
            <Link to={ROUTES.FOUNDATION.ACCESS.USER_DETAIL(userId)}>Xem chi tiết</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to={ROUTES.FOUNDATION.ACCESS.USER_EDIT(userId)}>Chỉnh sửa phân quyền</Link>
          </Button>
        )
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={detailError?.message ?? 'Không thể tải phân quyền người dùng.'}
    >
      <ActionPanel
        title="Phân quyền người dùng"
        description="Mutation vai trò và phạm vi dữ liệu dùng lại contract RBAC/audit hiện có."
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        <UserAssignmentPanel
          key={userId}
          user={user}
          roles={roleCatalog}
          rolesStatus={rolesStatus}
          effective={effectiveQuery.data}
          reservedRoleCodes={reservedRoleCodes}
          dataScopes={dataScopesQuery.data ?? []}
          canManage={canMutate}
          readOnlyMessage={readOnlyMessage}
          pending={{
            assignRole: mutations.assignRole.isPending,
            removeRole: mutations.removeRole.isPending,
            assignScope: mutations.assignDataScope.isPending,
            removeScope: mutations.removeDataScope.isPending,
          }}
          conflicts={{
            role: conflictMessage(roleError) ?? undefined,
            scope: conflictMessage(scopeError) ?? undefined,
          }}
          onAssignRole={(input) =>
            mutations.assignRole.mutate(
              { userId, input },
              { onError: setRoleError, onSuccess: () => setRoleError(null) },
            )
          }
          onRemoveRole={(roleCode) =>
            mutations.removeRole.mutate(
              { userId, roleCode },
              { onError: setRoleError, onSuccess: () => setRoleError(null) },
            )
          }
          onAssignScope={(input) =>
            mutations.assignDataScope.mutate(
              { userId, input },
              { onError: setScopeError, onSuccess: () => setScopeError(null) },
            )
          }
          onRemoveScope={(scopeId) =>
            mutations.removeDataScope.mutate(
              { userId, scopeId },
              { onError: setScopeError, onSuccess: () => setScopeError(null) },
            )
          }
        />
      </ActionPanel>
    </DetailPageShell>
  );
}
