import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  ACTION_CODES,
  OBJECT_TYPES,
  type ActionCode,
  type ObjectType,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';
import {
  useAuditLogDetail,
  useAuditLogs,
} from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { useComplianceStore } from '@modules/Compliance/Application/Stores/ComplianceStore';
import { AuditLogDetailPanel } from '@modules/Compliance/Presentation/Components/AuditLogDetailPanel';
import { AuditLogTable } from '@modules/Compliance/Presentation/Components/AuditLogTable';
import { ComplianceStateView } from '@modules/Compliance/Presentation/Components/StateViews';

interface AuditFilters {
  actorUserId: string;
  action: ActionCode | '';
  objectType: ObjectType | '';
  reasonCodeId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilters = {
  actorUserId: '',
  action: '',
  objectType: '',
  reasonCodeId: '',
  from: '',
  to: '',
};

export function AuditLogPage() {
  const store = useComplianceStore();
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // Filters live in local state (reset on navigation; never go stale vs the catalog).
  const patch = (next: Partial<AuditFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1); // any filter change returns to the first page
  };

  // Debounce so free-text filters don't fire a request per keystroke (project pattern).
  const debounced = useDebouncedValue(filters, 300);
  const query = useAuditLogs({
    page,
    actorUserId: debounced.actorUserId || undefined,
    action: debounced.action || undefined,
    objectType: debounced.objectType || undefined,
    reasonCodeId: debounced.reasonCodeId || undefined,
    from: debounced.from || undefined,
    // Make the selected end date inclusive of the whole day (date-only -> end-of-day).
    to: debounced.to ? `${debounced.to}T23:59:59.999Z` : undefined,
  });
  const selectedId = store.selectedAuditLogId;
  const detailQuery = useAuditLogDetail(selectedId);
  // Only trust the detail query when it is for the current selection (guard vs a stale id).
  const selected =
    (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
    query.data?.items.find((entry) => entry.id === selectedId) ??
    null;

  const entries = query.data?.items ?? [];
  const meta = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : entries.length === 0
          ? 'empty'
          : 'ready';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Tra cứu immutable mọi thao tác ghi V0. Chỉ đọc — không sửa/xóa.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Actor user id
          <Input value={filters.actorUserId} onChange={(e) => patch({ actorUserId: e.target.value })} />
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
          Object type
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.objectType}
            onChange={(e) => patch({ objectType: e.target.value as ObjectType | '' })}
          >
            <option value="">All</option>
            {OBJECT_TYPES.map((objectType) => (
              <option key={objectType} value={objectType}>
                {objectType}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Reason code id
          <Input value={filters.reasonCodeId} onChange={(e) => patch({ reasonCodeId: e.target.value })} />
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
            <CardTitle className="text-base">Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <AuditLogTable
                  entries={entries}
                  selectedId={selectedId}
                  onSelect={(entry) => store.setSelectedAuditLogId(entry.id)}
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
                emptyLabel="No audit events match the filters."
                errorMessage={apiError?.message ?? 'Unable to load audit log.'}
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
              <AuditLogDetailPanel entry={selected} />
            ) : (
              <p className="text-muted-foreground text-sm">Chọn một sự kiện để xem before/after.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
