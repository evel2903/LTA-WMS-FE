import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  conflictMessage,
  isBadRequestError,
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import {
  useAllPermissions,
  useRoleDetail,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { buildPermissionMatrix, matrixCellKey } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import { RolePermissionEditor } from '@modules/AccessControl/Presentation/Components/RolePermissionEditor';

function detailState(params: {
  roleCode: string;
  isLoading: boolean;
  error: unknown;
}): PageBoundaryState | null {
  if (!params.roleCode) return 'notFound';
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (apiError?.status === 404) return 'notFound';
  if (params.error) return 'error';
  return null;
}

function grantSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

/** Parses a `matrixCellKey` back into its parts — safe because role_code/action/objectType never contain `::`. */
function parseGrantKey(key: string): { action: string; objectType: string } {
  const [, action, objectType] = key.split('::');
  return { action, objectType };
}

/** RA-04: object×action permission-matrix editor for a single role, replacing the RA-03 stub. */
export function RoleDetailPage() {
  const { roleCode: roleCodeParam } = useParams();
  const roleCode = roleCodeParam ?? '';

  const roleQuery = useRoleDetail(roleCode);
  const permissionsQuery = useAllPermissions();
  const mutations = useAccessControlMutations();

  const role = roleQuery.data;

  const matrix = useMemo(
    () => (role ? buildPermissionMatrix([role], permissionsQuery.data ?? []) : null),
    [role, permissionsQuery.data],
  );

  const [pendingGrants, setPendingGrants] = useState<Set<string>>(new Set());
  const [baselineGrants, setBaselineGrants] = useState<Set<string>>(new Set());
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const loadedRoleId = useRef<string | null>(null);

  // Initialize local editable state once per role — deliberately NOT re-synced on a background
  // refetch of the same role (e.g. window focus), which would silently discard unsaved edits.
  useEffect(() => {
    if (!role || !matrix) return;
    if (loadedRoleId.current === role.id) return;
    loadedRoleId.current = role.id;
    setBaselineGrants(new Set(matrix.grants));
    setPendingGrants(new Set(matrix.grants));
  }, [role, matrix]);

  const saveError = mutations.setRolePermissions.error;
  const resetError = mutations.resetRolePermissions.error;
  const forbidden =
    isForbiddenError(saveError) || isForbiddenError(resetError) || isForbiddenError(roleQuery.error);
  const inlineSaveError = isBadRequestError(saveError) ? toMutationErrorMessage(saveError) : null;
  const inlineResetError = isBadRequestError(resetError) ? toMutationErrorMessage(resetError) : null;
  const inlineConflictError = isConflictError(saveError) ? conflictMessage(saveError) : null;

  const isDirty = !grantSetsEqual(pendingGrants, baselineGrants);
  const isPending = mutations.setRolePermissions.isPending || mutations.resetRolePermissions.isPending;

  const state = detailState({
    roleCode,
    isLoading: roleQuery.isLoading || permissionsQuery.isLoading,
    error: roleQuery.error ?? permissionsQuery.error,
  });

  function reconcile(result: { permissions: { action: string; objectType: string }[]; version: number }) {
    if (!role) return;
    const next = new Set(
      result.permissions.map((pair) => matrixCellKey(role.roleCode, pair.action, pair.objectType)),
    );
    setBaselineGrants(next);
    setPendingGrants(next);
    setReasonCode('');
    setReasonNote('');
    // A stale error from the OTHER mutation (e.g. a failed Reset) must not keep showing
    // once this one succeeds — both share this success handler.
    mutations.setRolePermissions.reset();
    mutations.resetRolePermissions.reset();
  }

  function handleSave() {
    if (!role || !reasonCode) return;
    mutations.resetRolePermissions.reset(); // clear a stale Reset error before a fresh Save attempt
    const permissionPairs = [...pendingGrants].map(parseGrantKey);
    mutations.setRolePermissions.mutate(
      {
        id: role.id,
        roleCode: role.roleCode,
        input: {
          permissions: permissionPairs,
          version: role.permissionsVersion,
          reasonCode,
          reasonNote: reasonNote || undefined,
        },
      },
      { onSuccess: reconcile },
    );
  }

  function handleReset() {
    if (!role || !reasonCode) return;
    if (!window.confirm('Khôi phục vai trò này về đúng quyền mặc định (seed)? Mọi quyền thêm sau seed sẽ mất.')) {
      return;
    }
    mutations.setRolePermissions.reset(); // clear a stale Save error before a fresh Reset attempt
    mutations.resetRolePermissions.mutate(
      { id: role.id, roleCode: role.roleCode, input: { reasonCode, reasonNote: reasonNote || undefined } },
      { onSuccess: reconcile },
    );
  }

  return (
    <DetailPageShell
      title={role ? role.roleName : 'Chi tiết vai trò'}
      subtitle={role ? `Mã: ${role.roleCode} — ${role.isSystem ? 'Hệ thống' : 'Tuỳ chỉnh'}` : undefined}
      backTo={ROUTES.FOUNDATION.ACCESS.ROLES}
      backLabel="Quay lại danh sách vai trò"
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền xem' : undefined}
      stateMessage={
        roleQuery.error instanceof Error ? roleQuery.error.message : 'Không thể tải thông tin vai trò.'
      }
    >
      {role && matrix ? (
        <ActionPanel
          title="Ma trận quyền"
          description="Tick/bỏ tick quyền theo đối tượng × hành động. Lưu để áp dụng."
          governanceState={forbidden ? 'readOnly' : undefined}
          governanceMessage={forbidden ? 'Bạn không có quyền sửa quyền của vai trò này.' : undefined}
          footer={
            !forbidden ? (
              <div className="flex w-full flex-wrap items-end gap-3">
                <ReasonCodeSelect
                  id="role-permission-reason-code"
                  name="reasonCode"
                  label="Lý do"
                  value={reasonCode}
                  action="Update"
                  objectType="Role"
                  onChange={setReasonCode}
                />
                <label className="grid gap-1 text-sm">
                  Ghi chú (tuỳ chọn)
                  <Input
                    value={reasonNote}
                    onChange={(event) => setReasonNote(event.target.value)}
                    className="w-56"
                  />
                </label>
                <div className="ml-auto flex gap-2">
                  {role.isSystem ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!reasonCode || isPending}
                      onClick={handleReset}
                    >
                      Khôi phục về mặc định
                    </Button>
                  ) : null}
                  <Button type="button" disabled={!reasonCode || !isDirty || isPending} onClick={handleSave}>
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            ) : null
          }
        >
          {isDirty && !forbidden && (
            <Alert role="status" variant="warning">
              <AlertDescription>Có thay đổi chưa lưu. Chọn lý do rồi bấm "Lưu thay đổi" để áp dụng.</AlertDescription>
            </Alert>
          )}
          {inlineConflictError && (
            <Alert role="alert" variant="destructive">
              <AlertDescription>
                {inlineConflictError}{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => window.location.reload()}
                >
                  Tải lại trang
                </button>
              </AlertDescription>
            </Alert>
          )}
          {inlineSaveError && !inlineConflictError && (
            <p role="alert" className="text-destructive text-sm">
              {inlineSaveError}
            </p>
          )}
          {inlineResetError && (
            <p role="alert" className="text-destructive text-sm">
              {inlineResetError}
            </p>
          )}
          <RolePermissionEditor
            roleCode={role.roleCode}
            isSystem={role.isSystem}
            matrix={matrix}
            pendingGrants={pendingGrants}
            baselineGrants={baselineGrants}
            disabled={forbidden || isPending}
            onChange={setPendingGrants}
          />
        </ActionPanel>
      ) : null}
    </DetailPageShell>
  );
}
