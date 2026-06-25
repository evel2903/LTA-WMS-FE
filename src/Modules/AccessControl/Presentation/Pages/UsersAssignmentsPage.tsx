import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { useUsers } from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';
import { UsersTable } from '@modules/AccessControl/Presentation/Components/UsersTable';

function listState(params: {
  error: unknown;
  isLoading: boolean;
  itemCount: number;
}): PageBoundaryState | null {
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (params.error) return 'error';
  if (params.itemCount === 0) return 'empty';
  return null;
}

export function UsersAssignmentsPage() {
  const store = useAccessControlStore();
  const navigate = useNavigate();
  const usersQuery = useUsers({ page: store.page });
  const users = usersQuery.data?.items ?? [];
  const apiError = usersQuery.error instanceof ApiError ? usersQuery.error : null;
  const state = listState({ error: usersQuery.error, isLoading: usersQuery.isLoading, itemCount: users.length });

  return (
    <ListPageShell
      title="Người dùng và phân quyền"
      description="Quét danh sách người dùng trước khi mở trang chi tiết/action phân quyền riêng."
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={state === 'empty' ? 'Chưa có người dùng.' : (apiError?.message ?? 'Không thể tải người dùng.')}
    >
      <UsersTable
        users={users}
        selectedId={null}
        onSelect={(user) => {
          store.setSelectedUserId(user.id);
          void navigate(ROUTES.FOUNDATION.ACCESS.USER_DETAIL(user.id));
        }}
      />
    </ListPageShell>
  );
}
