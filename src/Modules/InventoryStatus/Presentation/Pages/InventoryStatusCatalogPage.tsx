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
import { inlineMessage } from '@modules/InventoryStatus/Application/Commands/InventoryStatusMutationError';
import { useInventoryStatusMutations } from '@modules/InventoryStatus/Application/Commands/UseInventoryStatusMutations';
import {
  useInventoryStatusDetail,
  useInventoryStatuses,
} from '@modules/InventoryStatus/Application/Queries/UseInventoryStatusQueries';
import { useInventoryStatusStore } from '@modules/InventoryStatus/Application/Stores/InventoryStatusStore';
import type { MasterDataStatus } from '@modules/InventoryStatus/Domain/Enums/InventoryStatusEnums';
import { InventoryStatusStateView } from '@modules/InventoryStatus/Presentation/Components/StateViews';
import { InventoryStatusTable } from '@modules/InventoryStatus/Presentation/Components/InventoryStatusTable';
import { InventoryStatusForm } from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusForm';
import type { InventoryStatusFormValues } from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusFormSchema';

interface Filters {
  statusCode: string;
  stageGroup: string;
  status: MasterDataStatus | '';
}

const EMPTY_FILTERS: Filters = { statusCode: '', stageGroup: '', status: '' };

export function InventoryStatusCatalogPage() {
  const store = useInventoryStatusStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState<unknown>(null);

  // Text filters debounce before hitting the query key; the status select applies immediately.
  const debouncedCode = useDebouncedValue(filters.statusCode);
  const debouncedStage = useDebouncedValue(filters.stageGroup);

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const query = useInventoryStatuses({
    page,
    statusCode: debouncedCode || undefined,
    stageGroup: debouncedStage || undefined,
    status: filters.status || undefined,
  });
  const selectedId = store.selectedId;
  const detailQuery = useInventoryStatusDetail(selectedId);
  const inventoryStatusData = useResilientQueryData(query.data);
  const selected =
    (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
    inventoryStatusData?.items.find((item) => item.id === selectedId) ??
    null;
  const mutations = useInventoryStatusMutations();

  const items = inventoryStatusData?.items ?? [];
  const meta = inventoryStatusData;
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

  const submitUpdate = (id: string, values: InventoryStatusFormValues) =>
    mutations.update.mutate(
      {
        id,
        input: {
          allowsAllocation: values.allowsAllocation,
          allowsPick: values.allowsPick,
          hold: values.hold,
          isTerminal: values.isTerminal,
          isMilestone: values.isMilestone,
          sortOrder: values.sortOrder,
          status: values.status,
          reasonCode: values.reasonCode,
        },
      },
      { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Status Catalog</h1>
        <p className="text-muted-foreground">
          Quản lý cờ hành vi của inventory status (forAllocation / forPick / hold). Sửa cần reason code
          hợp lệ và được audit; không xóa status đã dùng.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Status code
          <Input
            className="h-9"
            placeholder="e.g. AVAILABLE"
            value={filters.statusCode}
            onChange={(e) => patch({ statusCode: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Stage group
          <Input
            className="h-9"
            placeholder="e.g. Storage"
            value={filters.stageGroup}
            onChange={(e) => patch({ stageGroup: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.status}
            onChange={(e) => patch({ status: e.target.value as MasterDataStatus | '' })}
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory statuses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <ListRefetchWarning error={query.error} hasData={items.length > 0} />
                <InventoryStatusTable
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
              <InventoryStatusStateView
                state={listState}
                emptyLabel="No inventory statuses match the filters."
                errorMessage={apiError?.message ?? 'Unable to load inventory statuses.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `Edit ${selected.statusCode}` : 'Edit inventory status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailQueryAlert
              error={detailQuery.error}
              fallback="Không tải được chi tiết inventory status. Đang hiển thị dữ liệu từ danh sách."
            />
            {!canManage && <p className="text-muted-foreground text-xs">Read only.</p>}
            {selected ? (
              <InventoryStatusForm
                // Remount with fresh server values after a successful PATCH (no version field —
                // updatedAt changes on every write); also clears the entered reason code.
                key={`edit-${selected.id}-${selected.updatedAt ?? ''}`}
                status={selected}
                disabled={!canManage}
                pending={mutations.update.isPending}
                inlineError={inlineMessage(submitError) ?? undefined}
                onSubmit={(values) => submitUpdate(selected.id, values)}
              />
            ) : (
              <p className="text-muted-foreground text-sm">Chọn một status ở bảng bên trái để sửa.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
