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
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  EXCEPTION_STATES,
  EXCEPTION_STATE_LABELS,
  SEVERITIES,
  type ControlExceptionSeverity,
  type ExceptionState,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';
import { blockedMessage } from '@modules/Compliance/Application/Commands/ComplianceMutationError';
import { useExceptionMutations } from '@modules/Compliance/Application/Commands/UseExceptionMutations';
import {
  useExceptionDetail,
  useExceptions,
} from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { useComplianceStore } from '@modules/Compliance/Application/Stores/ComplianceStore';
import { ComplianceStateView } from '@modules/Compliance/Presentation/Components/StateViews';
import { ExceptionDetailPanel } from '@modules/Compliance/Presentation/Components/ExceptionDetailPanel';
import { ExceptionTable } from '@modules/Compliance/Presentation/Components/ExceptionTable';

interface ExceptionFilters {
  state: ExceptionState | '';
  exceptionType: string;
  severity: ControlExceptionSeverity | '';
  assignedToUserId: string;
  warehouseId: string;
  ownerId: string;
  referenceId: string;
}

const EMPTY_FILTERS: ExceptionFilters = {
  state: '',
  exceptionType: '',
  severity: '',
  assignedToUserId: '',
  warehouseId: '',
  ownerId: '',
  referenceId: '',
};

export function ExceptionQueuePage() {
  const store = useComplianceStore();
  const [filters, setFilters] = useState<ExceptionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<unknown>(null);

  const patch = (next: Partial<ExceptionFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  // Debounce so free-text filters don't fire a request per keystroke (project pattern).
  const debounced = useDebouncedValue(filters, 300);
  const query = useExceptions({
    page,
    state: debounced.state || undefined,
    exceptionType: debounced.exceptionType || undefined,
    severity: debounced.severity || undefined,
    assignedToUserId: debounced.assignedToUserId || undefined,
    warehouseId: debounced.warehouseId || undefined,
    ownerId: debounced.ownerId || undefined,
    referenceId: debounced.referenceId || undefined,
  });
  const selectedId = store.selectedExceptionId;
  const detailQuery = useExceptionDetail(selectedId);
  const exceptionData = useResilientQueryData(query.data);
  // Only trust the detail query when it is for the current selection (guard vs a stale id).
  const selected =
    (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
    exceptionData?.items.find((item) => item.id === selectedId) ??
    null;
  const mutations = useExceptionMutations();

  const cases = exceptionData?.items ?? [];
  const meta = exceptionData;
  const listApiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: cases.length,
  });

  const detailApiError =
    (detailQuery.error instanceof ApiError ? detailQuery.error : null) ??
    (actionError instanceof ApiError && actionError.isForbidden ? actionError : null);
  const canManage = !listApiError?.isForbidden && !detailApiError?.isForbidden;
  const pending =
    mutations.logException.isPending ||
    mutations.assignException.isPending ||
    mutations.submitException.isPending ||
    mutations.resolveException.isPending ||
    mutations.closeException.isPending;

  const selectCase = (id: string | null) => {
    store.setSelectedExceptionId(id);
    setActionError(null);
  };
  const runOptions = { onError: setActionError, onSuccess: () => setActionError(null) };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exception Queue</h1>
        <p className="text-muted-foreground">
          Xử lý exception theo 6-state lifecycle. Chỉ action hợp lệ với state hiện tại được bật.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          State
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.state}
            onChange={(e) => patch({ state: e.target.value as ExceptionState | '' })}
          >
            <option value="">All</option>
            {EXCEPTION_STATES.map((state) => (
              <option key={state} value={state}>
                {EXCEPTION_STATE_LABELS[state]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Severity
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.severity}
            onChange={(e) => patch({ severity: e.target.value as ControlExceptionSeverity | '' })}
          >
            <option value="">All</option>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Type
          <Input value={filters.exceptionType} onChange={(e) => patch({ exceptionType: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          Assigned to
          <Input value={filters.assignedToUserId} onChange={(e) => patch({ assignedToUserId: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          Reference id
          <Input value={filters.referenceId} onChange={(e) => patch({ referenceId: e.target.value })} />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exceptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <ListRefetchWarning error={query.error} hasData={cases.length > 0} />
                <ExceptionTable
                  cases={cases}
                  selectedId={selectedId}
                  onSelect={(item) => selectCase(item.id)}
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
              <ComplianceStateView
                state={listState}
                emptyLabel="No exceptions match the filters."
                errorMessage={listApiError?.message ?? 'Unable to load exceptions.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailQueryAlert
              error={detailQuery.error}
              fallback="Không tải được chi tiết exception. Đang hiển thị dữ liệu từ danh sách."
            />
            {!selected ? (
              <p className="text-muted-foreground text-sm">Chọn một exception để xử lý.</p>
            ) : (
              <ExceptionDetailPanel
                key={selected.id}
                exceptionCase={selected}
                canManage={canManage}
                pending={pending}
                blocked={blockedMessage(actionError) ?? undefined}
                onLog={(input) => mutations.logException.mutate({ id: selected.id, input }, runOptions)}
                onAssign={(input) => mutations.assignException.mutate({ id: selected.id, input }, runOptions)}
                onSubmit={(input) => mutations.submitException.mutate({ id: selected.id, input }, runOptions)}
                onResolve={(input) => mutations.resolveException.mutate({ id: selected.id, input }, runOptions)}
                onClose={() => mutations.closeException.mutate({ id: selected.id }, runOptions)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
