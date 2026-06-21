import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  OBJECT_TYPES,
  type ObjectType,
} from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';
import {
  useOverrideLogDetail,
  useOverrideLogs,
} from '@modules/OverrideLog/Application/Queries/UseOverrideLogQueries';
import { useOverrideLogStore } from '@modules/OverrideLog/Application/Stores/OverrideLogStore';
import { OverrideLogStateView } from '@modules/OverrideLog/Presentation/Components/StateViews';
import { OverrideLogTable } from '@modules/OverrideLog/Presentation/Components/OverrideLogTable';
import { OverrideLogDetailPanel } from '@modules/OverrideLog/Presentation/Components/OverrideLogDetailPanel';

interface Filters {
  ruleId: string;
  actorUserId: string;
  targetObjectType: ObjectType | '';
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  ruleId: '',
  actorUserId: '',
  targetObjectType: '',
  from: '',
  to: '',
};

export function OverrideLogPage() {
  const store = useOverrideLogStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // Filters live in local state (reset on navigation; never go stale vs the log).
  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1); // any filter change returns to the first page
  };

  // Debounce the free-text fields so they don't fire a request per keystroke.
  const debouncedRuleId = useDebouncedValue(filters.ruleId, 300);
  const debouncedActor = useDebouncedValue(filters.actorUserId, 300);
  const query = useOverrideLogs({
    page,
    ruleId: debouncedRuleId || undefined,
    actorUserId: debouncedActor || undefined,
    targetObjectType: filters.targetObjectType || undefined,
    from: filters.from || undefined,
    // Make the selected end date inclusive of the whole day (date-only -> end-of-day).
    to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
  });
  const selectedId = store.selectedLogId;
  const detailQuery = useOverrideLogDetail(selectedId);
  // Only trust the detail query when it is for the current selection (guard vs a stale id).
  const selected =
    (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
    query.data?.items.find((log) => log.id === selectedId) ??
    null;

  const logs = query.data?.items ?? [];
  const meta = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : logs.length === 0
          ? 'empty'
          : 'ready';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Override Log</h1>
        <p className="text-muted-foreground">
          Tra cứu immutable mọi override rule (rule, actor, target, reason, approval). Chỉ đọc —
          không sửa/xóa. Lọc theo scope được áp dụng ở backend.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Rule id
          <Input value={filters.ruleId} onChange={(e) => patch({ ruleId: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          Actor user id
          <Input value={filters.actorUserId} onChange={(e) => patch({ actorUserId: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          Target type
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
          From
          <Input type="date" value={filters.from} onChange={(e) => patch({ from: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          To
          <Input type="date" value={filters.to} onChange={(e) => patch({ to: e.target.value })} />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overrides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <OverrideLogTable
                  logs={logs}
                  selectedId={selectedId}
                  onSelect={(log) => store.setSelectedLogId(log.id)}
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
              <OverrideLogStateView
                state={listState}
                emptyLabel="No override logs match the filters."
                errorMessage={apiError?.message ?? 'Unable to load override logs.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <OverrideLogDetailPanel log={selected} />
            ) : (
              <p className="text-muted-foreground text-sm">Chọn một override để xem before/after.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
