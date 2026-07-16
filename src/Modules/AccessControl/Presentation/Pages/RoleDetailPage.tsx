import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutationState } from '@tanstack/react-query';

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
import {
  ROLE_PERMISSIONS_MUTATION_KEYS,
  useAccessControlMutations,
} from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import {
  useAllPermissions,
  useRoleDetail,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { buildPermissionMatrix, matrixCellKey } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import { RolePermissionEditor } from '@modules/AccessControl/Presentation/Components/RolePermissionEditor';

/** One row of mutation-cache state for a role-permissions Save/Reset, as read via
 * `useMutationState` — deriving pending/error from the CACHE (filtered by role + mutationKey)
 * rather than a single `useMutation()` observer's own reactive fields, which only ever reflect
 * the LATEST call across ALL roles (Review Finding, latest re-review). */
interface RolePermissionsMutationSnapshot {
  kind: 'save' | 'reset';
  status: 'idle' | 'pending' | 'error' | 'success';
  error: unknown;
  submittedAt: number;
  roleCode: string | undefined;
}

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
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const loadedRoleId = useRef<string | null>(null);
  // Updated synchronously on every render (not gated on this role's data finishing loading) so a
  // mutation for the OLD role that settles in the narrow window after navigating away but before
  // the NEW role's own data has arrived is still correctly recognized as stale by `reconcile()`
  // (Review Finding, re-review of post-merge fixes).
  const currentRoleCodeRef = useRef(roleCode);
  currentRoleCodeRef.current = roleCode;

  // Initialize local editable state once per role — deliberately NOT re-synced on a background
  // refetch of the same role (e.g. window focus), which would silently discard unsaved edits.
  // `role`/`matrix` are always trustworthy here: `UseAccessControlMutations.ts`'s onSuccess
  // handlers patch the role-detail query cache directly and synchronously with every Save/Reset
  // response, so this needs no separate local cache of its own (Review Finding, latest re-review
  // — a component-ref cache doesn't survive this page unmounting, e.g. via the roles list).
  useEffect(() => {
    if (!role || !matrix) return;
    if (loadedRoleId.current === role.id) return;
    loadedRoleId.current = role.id;
    setBaselineGrants(new Set(matrix.grants));
    setPendingGrants(new Set(matrix.grants));
    setPermissionsVersion(role.permissionsVersion);
  }, [role, matrix]);

  // Pending/error for Save and Reset are derived from the MUTATION CACHE (via `useMutationState`,
  // filtered by mutationKey), not from `mutations.setRolePermissions`/`resetRolePermissions`'s own
  // reactive fields — a single `useMutation()` observer only ever reflects its LATEST `.mutate*()`
  // call, across ALL roles, since the route has no per-roleCode `key` and this page never
  // unmounts between two role-detail views. Save Role A, navigate to B, Save B before A settles,
  // return to A: the observer would show only B's state, hiding A's own pending/failure (Review
  // Finding, latest re-review). Filtering the cache by THIS role's `roleCode` and taking the
  // overall-latest entry across BOTH mutation types (by `submittedAt`) reflects the true state of
  // whichever action most recently ran for THIS role specifically, and — since a fresh attempt
  // immediately becomes cache's newest entry — naturally supersedes a stale error from the OTHER
  // mutation type without needing explicit `.reset()` calls.
  const saveStates = useMutationState<RolePermissionsMutationSnapshot>({
    filters: { mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.set },
    select: (m) => ({
      kind: 'save',
      status: m.state.status,
      error: m.state.error,
      submittedAt: m.state.submittedAt,
      roleCode: (m.state.variables as { roleCode?: string } | undefined)?.roleCode,
    }),
  });
  const resetStates = useMutationState<RolePermissionsMutationSnapshot>({
    filters: { mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.reset },
    select: (m) => ({
      kind: 'reset',
      status: m.state.status,
      error: m.state.error,
      submittedAt: m.state.submittedAt,
      roleCode: (m.state.variables as { roleCode?: string } | undefined)?.roleCode,
    }),
  });
  const latestForRole = [...saveStates, ...resetStates]
    .filter((entry) => entry.roleCode === roleCode)
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .at(-1);

  const currentError = latestForRole?.status === 'error' ? latestForRole.error : null;
  const forbidden = isForbiddenError(currentError) || isForbiddenError(roleQuery.error);
  const inlineSaveError =
    latestForRole?.kind === 'save' && isBadRequestError(currentError) ? toMutationErrorMessage(currentError) : null;
  const inlineResetError =
    latestForRole?.kind === 'reset' && isBadRequestError(currentError) ? toMutationErrorMessage(currentError) : null;
  const inlineConflictError =
    latestForRole?.kind === 'save' && isConflictError(currentError) ? conflictMessage(currentError) : null;

  const isDirty = !grantSetsEqual(pendingGrants, baselineGrants);
  const isPending = latestForRole?.status === 'pending';

  const state = detailState({
    roleCode,
    isLoading: roleQuery.isLoading || permissionsQuery.isLoading,
    error: roleQuery.error ?? permissionsQuery.error,
  });

  function reconcile(result: { permissions: { action: string; objectType: string }[]; version: number }) {
    // Bail out on applying to the VISIBLE editor if this mutation was started for a role the
    // user has since navigated away from (the route has no per-roleCode `key`, so the component
    // stays mounted) — otherwise a late-settling Save/Reset for the OLD role would overwrite the
    // NEW role's editor state. The role-detail query cache itself is already kept correct for
    // EVERY role regardless (patched in `UseAccessControlMutations.ts`'s onSuccess), so skipping
    // the local-state update here only means "don't show it on screen right now", not "lose it".
    if (!role || role.roleCode !== currentRoleCodeRef.current) return;
    const next = new Set(
      result.permissions.map((pair) => matrixCellKey(role.roleCode, pair.action, pair.objectType)),
    );
    setBaselineGrants(next);
    setPendingGrants(next);
    setPermissionsVersion(result.version);
    setReasonCode('');
    setReasonNote('');
  }

  function handleSave() {
    if (!role || !reasonCode) return;
    const permissionPairs = [...pendingGrants].map(parseGrantKey);
    // `mutateAsync` (not `mutate` + a per-call `onSuccess`) — TanStack Query overwrites a
    // `mutate()` call's own callback options with whichever `mutate()` call happens next on the
    // same observer, even if the earlier call hasn't settled yet (documented behavior: "Callbacks
    // passed to mutate fire only once for the last call... as the observer is reset with each
    // call"). Save-Role-A-then-Save-Role-B-before-A-settles would silently drop A's own
    // `reconcile()` call. `mutateAsync`'s returned Promise is independent per call and isn't
    // affected by later calls on the same observer (Review Finding, final re-review).
    mutations.setRolePermissions
      .mutateAsync({
        id: role.id,
        roleCode: role.roleCode,
        input: {
          permissions: permissionPairs,
          version: permissionsVersion,
          reasonCode,
          reasonNote: reasonNote || undefined,
        },
      })
      .then(reconcile)
      .catch(() => {}); // error state is already tracked reactively via `latestForRole` (mutation cache)
  }

  function handleReset() {
    if (!role || !reasonCode) return;
    if (!window.confirm('Khôi phục vai trò này về đúng quyền mặc định (seed)? Mọi quyền thêm sau seed sẽ mất.')) {
      return;
    }
    mutations.resetRolePermissions
      .mutateAsync({ id: role.id, roleCode: role.roleCode, input: { reasonCode, reasonNote: reasonNote || undefined } })
      .then(reconcile)
      .catch(() => {});
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
