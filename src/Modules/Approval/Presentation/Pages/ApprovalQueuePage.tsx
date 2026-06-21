import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useCurrentUser } from '@modules/Auth/Application/UseCases/UseCurrentUser';
import { blockedMessage } from '@modules/Approval/Application/Commands/ApprovalMutationError';
import { useApprovalMutations } from '@modules/Approval/Application/Commands/UseApprovalMutations';
import {
  useApprovalRequestDetail,
  useApprovalRequests,
} from '@modules/Approval/Application/Queries/UseApprovalQueries';
import { useApprovalStore } from '@modules/Approval/Application/Stores/ApprovalStore';
import {
  ACTION_CODES,
  APPROVAL_DECISIONS,
  APPROVAL_DECISION_LABELS,
  OBJECT_TYPES,
  type ActionCode,
  type ApprovalDecision,
  type ObjectType,
} from '@modules/Approval/Domain/Enums/ApprovalEnums';
import { ApprovalStateView } from '@modules/Approval/Presentation/Components/StateViews';
import { ApprovalRequestTable } from '@modules/Approval/Presentation/Components/ApprovalRequestTable';
import { ApprovalDetailPanel } from '@modules/Approval/Presentation/Components/ApprovalDetailPanel';

interface Filters {
  decision: ApprovalDecision | '';
  action: ActionCode | '';
  targetObjectType: ObjectType | '';
  requesterUserId: string;
  targetObjectId: string;
}

const EMPTY_FILTERS: Filters = {
  decision: '',
  action: '',
  targetObjectType: '',
  requesterUserId: '',
  targetObjectId: '',
};

export function ApprovalQueuePage() {
  const store = useApprovalStore();
  const currentUser = useCurrentUser();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<unknown>(null);

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  // Debounce only the free-text fields (each independently) so they don't fire a request per
  // keystroke; enum selects apply immediately. Debouncing per-field avoids snapshotting the
  // enum filters into a stale combined object when a select changes mid-typing.
  const debouncedRequester = useDebouncedValue(filters.requesterUserId, 300);
  const debouncedTargetId = useDebouncedValue(filters.targetObjectId, 300);
  const query = useApprovalRequests({
    page,
    decision: filters.decision || undefined,
    action: filters.action || undefined,
    targetObjectType: filters.targetObjectType || undefined,
    requesterUserId: debouncedRequester || undefined,
    targetObjectId: debouncedTargetId || undefined,
  });
  const selectedId = store.selectedRequestId;
  const detailQuery = useApprovalRequestDetail(selectedId);
  // Only trust the detail query when it is for the current selection (guard vs a stale id).
  const selected =
    (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
    query.data?.items.find((item) => item.id === selectedId) ??
    null;
  const mutations = useApprovalMutations();

  const items = query.data?.items ?? [];
  const meta = query.data;
  const listApiError = query.error instanceof ApiError ? query.error : null;
  const listState = listApiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'ready';

  const detailApiError =
    (detailQuery.error instanceof ApiError ? detailQuery.error : null) ??
    (actionError instanceof ApiError && actionError.isForbidden ? actionError : null);
  const canManage = !listApiError?.isForbidden && !detailApiError?.isForbidden;
  const pending = mutations.approve.isPending || mutations.reject.isPending;

  const select = (id: string | null) => {
    store.setSelectedRequestId(id);
    setActionError(null);
  };
  const runOptions = { onError: setActionError, onSuccess: () => setActionError(null) };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground">
          Xem và xử lý approval request. Approve/reject cần quyền duyệt; không thể tự duyệt request của
          chính mình; quyết định được audit.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Decision
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.decision}
            onChange={(e) => patch({ decision: e.target.value as ApprovalDecision | '' })}
          >
            <option value="">All</option>
            {APPROVAL_DECISIONS.map((decision) => (
              <option key={decision} value={decision}>
                {APPROVAL_DECISION_LABELS[decision]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Type
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.targetObjectType}
            onChange={(e) => patch({ targetObjectType: e.target.value as ObjectType | '' })}
          >
            <option value="">All</option>
            {OBJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Action
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.action}
            onChange={(e) => patch({ action: e.target.value as ActionCode | '' })}
          >
            <option value="">All</option>
            {ACTION_CODES.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Requester user id
          <Input
            value={filters.requesterUserId}
            onChange={(e) => patch({ requesterUserId: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Target object id
          <Input
            value={filters.targetObjectId}
            onChange={(e) => patch({ targetObjectId: e.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <ApprovalRequestTable
                  items={items}
                  selectedId={selectedId}
                  onSelect={(item) => select(item.id)}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {meta?.page ?? 1} / {meta?.totalPages ?? 1}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= (meta?.totalPages ?? 1)}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <ApprovalStateView
                state={listState}
                emptyLabel="No approval requests match the filters."
                errorMessage={listApiError?.message ?? 'Unable to load approval requests.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-muted-foreground text-sm">Chọn một request để xử lý.</p>
            ) : (
              <ApprovalDetailPanel
                key={selected.id}
                request={selected}
                canManage={canManage}
                isSelfRequester={Boolean(currentUser) && selected.requesterUserId === currentUser?.id}
                pending={pending}
                blocked={blockedMessage(actionError) ?? undefined}
                onApprove={(input) => mutations.approve.mutate({ id: selected.id, input }, runOptions)}
                onReject={(input) => mutations.reject.mutate({ id: selected.id, input }, runOptions)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
