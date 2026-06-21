import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import {
  DetailQueryAlert,
  ListRefetchWarning,
} from '@shared/Components/Feedback/QueryResilience';
import {
  resolveListViewState,
  useResilientQueryData,
} from '@shared/Utils/QueryResilience';
import { conflictMessage } from '@modules/ReasonCode/Application/Commands/ReasonCodeMutationError';
import { useReasonCodeMutations } from '@modules/ReasonCode/Application/Commands/UseReasonCodeMutations';
import {
  useReasonCodeDetail,
  useReasonCodes,
} from '@modules/ReasonCode/Application/Queries/UseReasonCodeQueries';
import { useReasonCodeStore } from '@modules/ReasonCode/Application/Stores/ReasonCodeStore';
import {
  ACTION_CODES,
  REASON_GROUPS,
  REASON_GROUP_LABELS,
  type ActionCode,
  type ReasonCodeStatus,
  type ReasonGroup,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';
import { ReasonCodeStateView } from '@modules/ReasonCode/Presentation/Components/StateViews';
import { ReasonCodeTable } from '@modules/ReasonCode/Presentation/Components/ReasonCodeTable';
import { ReasonCodeForm } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeForm';
import type { ReasonCodeFormValues } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeFormSchema';

interface Filters {
  reasonGroup: ReasonGroup | '';
  status: ReasonCodeStatus | '';
  action: ActionCode | '';
}

const EMPTY_FILTERS: Filters = { reasonGroup: '', status: '', action: '' };

export function ReasonCodeCatalogPage() {
  const store = useReasonCodeStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const query = useReasonCodes({
    page,
    reasonGroup: filters.reasonGroup || undefined,
    status: filters.status || undefined,
    action: filters.action || undefined,
  });
  const selectedId = store.selectedId;
  const detailQuery = useReasonCodeDetail(selectedId);
  const reasonCodeData = useResilientQueryData(query.data);
  const selected =
    (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
    reasonCodeData?.items.find((item) => item.id === selectedId) ??
    null;
  const selectedMissing = Boolean(selectedId) && !selected;
  const mutations = useReasonCodeMutations();

  const items = reasonCodeData?.items ?? [];
  const meta = reasonCodeData;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const detailForbidden = detailQuery.error instanceof ApiError && detailQuery.error.isForbidden;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canManage = !apiError?.isForbidden && !detailForbidden && !submitForbidden;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: items.length,
  });

  const select = (id: string | null) => {
    store.setSelectedId(id);
    setSubmitError(null);
  };

  const submitCreate = (values: ReasonCodeFormValues) =>
    mutations.create.mutate(
      {
        reasonCode: values.reasonCode,
        reasonGroup: values.reasonGroup,
        description: values.description,
        appliesToActions: values.appliesToActions,
        appliesToObjects: values.appliesToObjects,
        evidenceRequired: values.evidenceRequired,
        approvalRequired: values.approvalRequired,
        allowedRoleCodes: values.allowedRoleCodes,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo,
      },
      {
        onError: setSubmitError,
        onSuccess: () => {
          setSubmitError(null);
          setCreateNonce((value) => value + 1);
        },
      },
    );

  const submitUpdate = (id: string, values: ReasonCodeFormValues) =>
    mutations.update.mutate(
      {
        id,
        input: {
          reasonGroup: values.reasonGroup,
          description: values.description,
          appliesToActions: values.appliesToActions,
          appliesToObjects: values.appliesToObjects,
          evidenceRequired: values.evidenceRequired,
          approvalRequired: values.approvalRequired,
          allowedRoleCodes: values.allowedRoleCodes,
          status: values.status,
          effectiveFrom: values.effectiveFrom,
          effectiveTo: values.effectiveTo,
        },
      },
      { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reason Code Catalog</h1>
        <p className="text-muted-foreground">
          Quản lý reason code chuẩn hóa (nhóm/action/evidence/version). Thay đổi được audit + versioned.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Category
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.reasonGroup}
            onChange={(e) => patch({ reasonGroup: e.target.value as ReasonGroup | '' })}
          >
            <option value="">All</option>
            {REASON_GROUPS.map((group) => (
              <option key={group} value={group}>
                {REASON_GROUP_LABELS[group]}
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
          Status
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.status}
            onChange={(e) => patch({ status: e.target.value as ReasonCodeStatus | '' })}
          >
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <Button size="sm" variant="outline" onClick={() => select(null)}>
          + New reason code
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reason codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <ListRefetchWarning error={query.error} hasData={items.length > 0} />
                <ReasonCodeTable items={items} selectedId={selectedId} onSelect={(item) => select(item.id)} />
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
              <ReasonCodeStateView
                state={listState}
                emptyLabel="No reason codes match the filters."
                errorMessage={apiError?.message ?? 'Unable to load reason codes.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? 'Edit reason code' : selectedMissing ? 'Reason code detail' : 'Create reason code'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailQueryAlert
              error={detailQuery.error}
              fallback="Không tải được chi tiết reason code. Đang hiển thị dữ liệu từ danh sách."
            />
            {!canManage && <p className="text-muted-foreground text-xs">Read only.</p>}
            {selected ? (
              <ReasonCodeForm
                // Include version so a successful PATCH remounts the form with fresh server
                // values (Version label + any normalized fields) without re-selecting the row.
                key={`edit-${selected.id}-${selected.version}`}
                mode="edit"
                initialValue={selected}
                disabled={!canManage}
                pending={mutations.update.isPending}
                onSubmit={(values) => submitUpdate(selected.id, values)}
              />
            ) : selectedMissing ? (
              <p className="text-muted-foreground text-sm">Không tải được reason code đã chọn.</p>
            ) : (
              <ReasonCodeForm
                key={`create-${createNonce}`}
                mode="create"
                disabled={!canManage}
                pending={mutations.create.isPending}
                // A duplicate-code 409 only applies to create (code is immutable on edit).
                conflict={conflictMessage(submitError) ?? undefined}
                onSubmit={submitCreate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
