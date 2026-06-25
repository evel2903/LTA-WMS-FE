import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { RECONCILIATION_RUN_STATUSES } from '@modules/Integration/Domain/Constants/IntegrationConstants';
import { useIntegrationReconciliationRuns } from '@modules/Integration/Application/Queries/UseIntegrationReconciliation';
import type { ReconciliationRun, ReconciliationRunStatus } from '@modules/Integration/Domain/Types/Integration';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể tải lần đối soát.';
}

function StatusBadge({ status }: { status: ReconciliationRunStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function ReconciliationRunRow({ run }: { run: ReconciliationRun }) {
  return (
    <Link
      to={ROUTES.INTEGRATION.RECONCILIATION_DETAIL(run.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{run.businessReference}</div>
          <div className="text-muted-foreground truncate text-xs">
            {run.warehouseId}
            {run.ownerId ? ` / ${run.ownerId}` : ' / chưa có chủ hàng'}
          </div>
        </div>
        <StatusBadge status={run.runStatus} />
      </div>
      <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
        <span>Dòng: {run.itemCount}</span>
        <span>Sai lệch: {run.mismatchCount}</span>
        <span>Ngoại lệ: {run.exceptionCount}</span>
        <span>Cập nhật: {run.updatedAt}</span>
      </div>
    </Link>
  );
}

export function IntegrationReconciliationPage() {
  const [businessReference, setBusinessReference] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [runStatus, setRunStatus] = useState<ReconciliationRunStatus | ''>('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');

  const query = useIntegrationReconciliationRuns({
    businessReference: businessReference.trim() || undefined,
    warehouseId: warehouseId.trim() || undefined,
    ownerId: ownerId.trim() || undefined,
    runStatus: runStatus || undefined,
    updatedFrom: updatedFrom.trim() || undefined,
    updatedTo: updatedTo.trim() || undefined,
  });
  const runs = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const state = query.isLoading ? 'loading' : query.error ? 'error' : runs.length === 0 ? 'empty' : null;

  return (
    <ListPageShell
      title="Đối soát tích hợp"
      description="Quét các lần đối soát theo tham chiếu nghiệp vụ, kho và chủ hàng trước khi mở chi tiết/thao tác."
      state={state}
      stateTitle={query.error ? 'Không thể tải lần đối soát' : undefined}
      stateMessage={query.error ? errorMessage(query.error) ?? undefined : 'Không có lần đối soát khớp bộ lọc.'}
      filters={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="grid gap-1 text-sm">
            Tham chiếu nghiệp vụ
            <Input value={businessReference} onChange={(event) => setBusinessReference(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Kho
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Chủ hàng
            <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Trạng thái
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={runStatus}
              onChange={(event) => setRunStatus(event.target.value as ReconciliationRunStatus | '')}
            >
              <option value="">Tất cả</option>
              {RECONCILIATION_RUN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {vietnameseOperationalLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Cập nhật từ
            <Input
              value={updatedFrom}
              placeholder="2026-06-25T00:00:00.000Z"
              onChange={(event) => setUpdatedFrom(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Cập nhật đến
            <Input
              value={updatedTo}
              placeholder="2026-06-25T23:59:59.999Z"
              onChange={(event) => setUpdatedTo(event.target.value)}
            />
          </label>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Đang tải lần đối soát
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <ReconciliationRunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}
