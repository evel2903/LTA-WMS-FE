import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ScanLine } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { usePutawayTasks } from '@modules/Putaway/Application/Queries/UsePutawayTasks';
import { PUTAWAY_TASK_STATUSES } from '@modules/Putaway/Domain/Constants/PutawayConstants';
import type { PutawayTask, PutawayTaskStatus } from '@modules/Putaway/Domain/Types/PutawayTask';

type TaskStatusFilter = 'All' | PutawayTaskStatus;

function TaskCard({ task }: { task: PutawayTask }) {
  return (
    <article className="border-border bg-card text-card-foreground space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{task.taskCode}</h2>
          <p className="text-muted-foreground text-sm">
            {task.skuCode ?? task.skuId} - {task.quantity} {task.uomCode ?? ''}
          </p>
        </div>
        <span className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium">
          {vietnameseOperationalLabel(task.taskStatus)}
        </span>
      </div>

      <dl className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">Nguồn</dt>
          <dd>{task.sourceLocationCode ?? 'chưa thiết lập'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Đích</dt>
          <dd>{task.targetLocationCode}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">LPN</dt>
          <dd>{task.lpnCode ?? 'chưa thiết lập'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Tác vụ mobile</dt>
          <dd>{task.mobileTaskId ?? 'chưa tạo'}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to={ROUTES.PUTAWAY.DETAIL(task.id)}>Mở chi tiết</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to={ROUTES.PUTAWAY.ACTION(task.id, 'confirm')}>
            <ScanLine className="size-4" aria-hidden="true" />
            Xác nhận quét
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function PutawayPage() {
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('Released');
  const warehouseId = useDebouncedValue(warehouseFilter, 250);
  const query = usePutawayTasks({
    page: 1,
    warehouseId: warehouseId || undefined,
    taskStatus: statusFilter === 'All' ? undefined : statusFilter,
  });
  const tasks = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = query.isLoading
    ? 'loading'
    : apiError?.isForbidden
      ? 'forbidden'
      : query.error
        ? 'error'
        : tasks.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Tác vụ cất hàng"
      description="Lọc và chọn tác vụ cất hàng. Phát hành, xác nhận quét và xử lý trạng thái bị chặn thực hiện ở trang chi tiết/thao tác."
      toolbar={
        <Button variant="secondary" size="icon" onClick={() => void query.refetch()} aria-label="Làm mới danh sách cất hàng">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Lọc kho
            <Input
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
              placeholder="warehouse-a"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Lọc trạng thái tác vụ
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TaskStatusFilter)}
            >
              <option value="All">Tất cả</option>
              {PUTAWAY_TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {vietnameseOperationalLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      state={state}
      stateTitle={
        state === 'forbidden'
          ? 'Từ chối quyền truy cập'
          : state === 'error'
            ? 'Không thể tải tác vụ cất hàng'
            : state === 'empty'
              ? 'Chưa có tác vụ cất hàng'
              : undefined
      }
      stateMessage={
        state === 'forbidden'
          ? apiError?.message
          : state === 'error'
            ? query.error instanceof Error
              ? query.error.message
              : 'Không thể tải tác vụ cất hàng.'
            : state === 'empty'
              ? 'Không có tác vụ cất hàng khớp bộ lọc hiện tại.'
              : undefined
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </ListPageShell>
  );
}
