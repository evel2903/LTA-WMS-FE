import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/Components/Ui/Table';
import {
  isBadRequestError,
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import { useRoleDetails, useRoles } from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';
import { RoleForm } from '@modules/AccessControl/Presentation/Forms/RoleForm';

function listState(params: { error: unknown; isLoading: boolean; itemCount: number }): PageBoundaryState | null {
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (params.error) return 'error';
  if (params.itemCount === 0) return 'empty';
  return null;
}

const roleStatusLabel = (status: string) => (status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động');

/** RA-03: roles list + "Tạo vai trò". "Chi tiết" only navigates — RA-04 owns the editor. */
export function RolesMasterPage() {
  const store = useAccessControlStore();
  const rolesQuery = useRoles({ page: store.rolesPage });
  const roles = rolesQuery.data?.items ?? [];
  const detailQueries = useRoleDetails(roles.map((role) => role.roleCode));
  const mutations = useAccessControlMutations();

  const [createOpen, setCreateOpen] = useState(false);

  const createError = mutations.createRole.error;
  const forbiddenToCreate = isForbiddenError(createError);
  const inlineCreateError =
    isConflictError(createError) || isBadRequestError(createError) ? toMutationErrorMessage(createError) : null;

  // 403 only surfaces after a submit attempt (no preflight check) — close any open modal
  // and demote the "Tạo vai trò" action for subsequent renders (AC2).
  useEffect(() => {
    if (forbiddenToCreate) setCreateOpen(false);
  }, [forbiddenToCreate]);

  // A previous attempt's 400/409 must not reappear when the modal is reopened for a
  // fresh create — the mutation's error state otherwise persists across close/reopen.
  const openCreateModal = () => {
    mutations.createRole.reset();
    setCreateOpen(true);
  };

  const apiError = rolesQuery.error instanceof ApiError ? rolesQuery.error : null;
  const state = listState({ error: rolesQuery.error, isLoading: rolesQuery.isLoading, itemCount: roles.length });
  const totalPages = rolesQuery.data?.totalPages ?? 1;

  return (
    <>
      <ListPageShell
        title="Vai trò"
        description="Danh sách vai trò RBAC — tạo vai trò tuỳ chỉnh hoặc mở chi tiết để xem quyền."
        contentAriaLabel="Danh sách vai trò"
        state={state}
        stateTitle={state === 'forbidden' ? 'Không có quyền xem' : undefined}
        stateMessage={
          state === 'empty' ? 'Chưa có vai trò.' : (apiError?.message ?? 'Không thể tải danh sách vai trò.')
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.FOUNDATION.ACCESS.PERMISSION_MATRIX}>Xem ma trận quyền (audit)</Link>
            </Button>
            {!forbiddenToCreate ? (
              <Button type="button" size="sm" onClick={openCreateModal}>
                Tạo vai trò
              </Button>
            ) : null}
          </div>
        }
        pagination={
          totalPages > 1 ? (
            <div className="flex items-center gap-2 text-sm">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={store.rolesPage <= 1}
                onClick={() => store.setRolesPage(store.rolesPage - 1)}
              >
                Trước
              </Button>
              <span>
                Trang {store.rolesPage}/{totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={store.rolesPage >= totalPages}
                onClick={() => store.setRolesPage(store.rolesPage + 1)}
              >
                Sau
              </Button>
            </div>
          ) : null
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên vai trò</TableHead>
              <TableHead>Mã vai trò</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Số quyền</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role, index) => {
              const detail = detailQueries[index];
              const permissionCount = detail?.data?.permissions.length;
              return (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.roleName}</TableCell>
                  <TableCell>{role.roleCode}</TableCell>
                  <TableCell>{role.isSystem ? 'Hệ thống' : 'Tuỳ chỉnh'}</TableCell>
                  <TableCell>{roleStatusLabel(role.status)}</TableCell>
                  <TableCell className="text-right">
                    {permissionCount ?? (detail?.isLoading ? '…' : '—')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(role.id)} state={{ role }}>
                        Chi tiết
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ListPageShell>

      <FormModal title="Tạo vai trò" open={createOpen} onClose={() => setCreateOpen(false)}>
        <RoleForm
          pending={mutations.createRole.isPending}
          error={inlineCreateError}
          onSubmit={(values) =>
            mutations.createRole.mutate(values, { onSuccess: () => setCreateOpen(false) })
          }
        />
      </FormModal>
    </>
  );
}
