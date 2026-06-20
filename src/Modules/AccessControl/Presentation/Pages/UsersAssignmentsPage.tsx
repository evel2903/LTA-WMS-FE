import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { conflictMessage } from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import {
  useUserDataScopes,
  useUserEffectivePermissions,
  useUsers,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';
import { AccessStateView } from '@modules/AccessControl/Presentation/Components/StateViews';
import { UserAssignmentPanel } from '@modules/AccessControl/Presentation/Components/UserAssignmentPanel';
import { UsersTable } from '@modules/AccessControl/Presentation/Components/UsersTable';

export function UsersAssignmentsPage() {
  const store = useAccessControlStore();
  const [roleError, setRoleError] = useState<unknown>(null);
  const [scopeError, setScopeError] = useState<unknown>(null);

  const usersQuery = useUsers({ page: store.page });
  const selectedId = store.selectedUserId;
  const users = usersQuery.data?.items ?? [];
  const selected = users.find((user) => user.id === selectedId) ?? null;

  const effectiveQuery = useUserEffectivePermissions(selectedId);
  const dataScopesQuery = useUserDataScopes(selectedId);
  const mutations = useAccessControlMutations();

  const listApiError = usersQuery.error instanceof ApiError ? usersQuery.error : null;
  const listState = listApiError?.isForbidden
    ? 'denied'
    : usersQuery.isLoading
      ? 'loading'
      : usersQuery.error
        ? 'error'
        : users.length === 0
          ? 'empty'
          : 'ready';

  // Detail = effective-permissions + data-scopes (both guarded by Read UserAssignment).
  // Fold BOTH queries so a failure on either is not silently rendered as "no scopes".
  const detailApiError =
    (effectiveQuery.error instanceof ApiError ? effectiveQuery.error : null) ??
    (dataScopesQuery.error instanceof ApiError ? dataScopesQuery.error : null);
  // A 403 on an assign/remove (Update permission) demotes the panel to read-only (AC3) —
  // the realistic non-admin path that holds Read but not Update on UserAssignment.
  const mutationForbidden =
    (roleError instanceof ApiError && roleError.isForbidden) ||
    (scopeError instanceof ApiError && scopeError.isForbidden);
  const canManage = !detailApiError?.isForbidden && !mutationForbidden;
  const detailState = detailApiError?.isForbidden
    ? 'denied'
    : effectiveQuery.isLoading || dataScopesQuery.isLoading
      ? 'loading'
      : effectiveQuery.error || dataScopesQuery.error
        ? 'error'
        : 'ready';

  const selectUser = (id: string | null) => {
    store.setSelectedUserId(id);
    setRoleError(null);
    setScopeError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users &amp; Assignments</h1>
        <p className="text-muted-foreground">
          Gán role và data scope cho user. Mọi thay đổi đi qua backend (deny-by-default, audited).
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent>
            {listState === 'ready' ? (
              <UsersTable
                users={users}
                selectedId={selectedId}
                onSelect={(user) => selectUser(user.id)}
              />
            ) : (
              <AccessStateView
                state={listState}
                emptyLabel="No users yet."
                errorMessage={listApiError?.message ?? 'Unable to load users.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-muted-foreground text-sm">Chọn một user để gán role / data scope.</p>
            ) : detailState !== 'ready' ? (
              <AccessStateView
                state={detailState}
                errorMessage={detailApiError?.message ?? 'Unable to load assignments.'}
              />
            ) : (
              <UserAssignmentPanel
                key={selected.id}
                user={selected}
                effective={effectiveQuery.data}
                dataScopes={dataScopesQuery.data ?? []}
                canManage={canManage}
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
                    { userId: selected.id, input },
                    { onError: setRoleError, onSuccess: () => setRoleError(null) },
                  )
                }
                onRemoveRole={(roleCode) =>
                  mutations.removeRole.mutate(
                    { userId: selected.id, roleCode },
                    { onError: setRoleError, onSuccess: () => setRoleError(null) },
                  )
                }
                onAssignScope={(input) =>
                  mutations.assignDataScope.mutate(
                    { userId: selected.id, input },
                    { onError: setScopeError, onSuccess: () => setScopeError(null) },
                  )
                }
                onRemoveScope={(scopeId) =>
                  mutations.removeDataScope.mutate(
                    { userId: selected.id, scopeId },
                    { onError: setScopeError, onSuccess: () => setScopeError(null) },
                  )
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
