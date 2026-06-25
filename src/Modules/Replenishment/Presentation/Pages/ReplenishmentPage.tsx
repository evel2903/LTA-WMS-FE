import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Input } from '@shared/Components/Ui/Input';
import { Button } from '@shared/Components/Ui/Button';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { REPLENISHMENT_TASK_STATUSES } from '@modules/Replenishment/Domain/Constants/ReplenishmentConstants';
import { useReplenishmentTasks } from '@modules/Replenishment/Application/Queries/UseReplenishmentTasks';
import type {
  ReplenishmentTask,
  ReplenishmentTaskStatus,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';

type StatusFilter = 'All' | ReplenishmentTaskStatus;

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể tải tác vụ bổ sung hàng.';
}

function StatusBadge({ status }: { status: ReplenishmentTaskStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function TaskRow({ task }: { task: ReplenishmentTask }) {
  return (
    <Link
      to={ROUTES.REPLENISHMENT.DETAIL(task.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{task.taskCode}</div>
          <div className="text-muted-foreground text-xs">
            {task.skuCode ?? task.skuId} - {task.quantity} {task.uomCode ?? ''}
          </div>
        </div>
        <StatusBadge status={task.taskStatus} />
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <div>Nguồn: {task.sourceBalanceId}</div>
        <div>Đích: {task.targetLocationCode ?? task.targetLocationId}</div>
        <div>Kích hoạt: {vietnameseOperationalLabel(task.triggerType)}</div>
      </div>
    </Link>
  );
}

export function ReplenishmentPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const hasScopeFilter = warehouseId.trim().length > 0 || ownerId.trim().length > 0;
  const query = useReplenishmentTasks(
    {
      warehouseId: warehouseId.trim() || undefined,
      ownerId: ownerId.trim() || undefined,
      taskStatus: statusFilter === 'All' ? undefined : statusFilter,
    },
    { enabled: hasScopeFilter },
  );
  const tasks = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const listError = errorMessage(query.error);
  const state = !hasScopeFilter
    ? 'empty'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : tasks.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Bổ sung hàng"
      description="Lọc tác vụ bổ sung hàng và mở trang chi tiết/thao tác cho phát hành, xác nhận, hủy hoặc đối soát."
      state={state}
      stateTitle={query.error ? 'Không thể tải tác vụ bổ sung hàng' : undefined}
      stateMessage={
        !hasScopeFilter
          ? 'Nhập kho hoặc chủ hàng để tải tác vụ bổ sung hàng.'
          : query.error
            ? listError ?? 'Không thể tải tác vụ bổ sung hàng.'
            : 'Không có tác vụ bổ sung hàng nào khớp bộ lọc.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.REPLENISHMENT.NEW}>
            <PackagePlus className="size-4" aria-hidden="true" />
            Phát hành tác vụ
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-3">
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="All">Tất cả</option>
              {REPLENISHMENT_TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {vietnameseOperationalLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Đang tải tác vụ bổ sung hàng
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}
