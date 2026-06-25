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
  useUserDataScopes,
  useUserEffectivePermissions,
  useUsers,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import type { UserSummary } from '@modules/AccessControl/Domain/Entities/AccessControl';
import { UserAssignmentPanel } from '@modules/AccessControl/Presentation/Components/UserAssignmentPanel';
import { useState } from 'react';

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
  const effectiveQuery = useUserEffectivePermissions(userId || null);
  const dataScopesQuery = useUserDataScopes(userId || null);
  const mutations = useAccessControlMutations();

  const user = usersQuery.data?.items.find((item) => item.id === userId) ?? fallbackUser(userId);
  const detailError =
    (effectiveQuery.error instanceof ApiError ? effectiveQuery.error : null) ??
    (dataScopesQuery.error instanceof ApiError ? dataScopesQuery.error : null);
  const mutationForbidden =
    (roleError instanceof ApiError && roleError.isForbidden) ||
    (scopeError instanceof ApiError && scopeError.isForbidden);
  const canMutate = isEdit && !detailError?.isForbidden && !mutationForbidden;
  const state = detailState({
    userId,
    isLoading: effectiveQuery.isLoading || dataScopesQuery.isLoading,
    error: detailError ?? effectiveQuery.error ?? dataScopesQuery.error,
  });

  return (
    <DetailPageShell
      title={`${user.firstName} ${user.lastName}`.trim() || user.email}
      subtitle="Rà soát quyền hiệu lực và phạm vi dữ liệu của người dùng trước khi mở action phân quyền."
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
          effective={effectiveQuery.data}
          dataScopes={dataScopesQuery.data ?? []}
          canManage={canMutate}
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
