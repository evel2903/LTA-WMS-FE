import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ScanLine } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
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
          {task.taskStatus}
        </span>
      </div>

      <dl className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">Source</dt>
          <dd>{task.sourceLocationCode ?? 'not set'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Target</dt>
          <dd>{task.targetLocationCode}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">LPN</dt>
          <dd>{task.lpnCode ?? 'not set'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Mobile task</dt>
          <dd>{task.mobileTaskId ?? 'not created'}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to={ROUTES.PUTAWAY.DETAIL(task.id)}>Open detail</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to={ROUTES.PUTAWAY.ACTION(task.id, 'confirm')}>
            <ScanLine className="size-4" aria-hidden="true" />
            Confirm scan
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
      title="Putaway tasks"
      description="Filter and select putaway tasks. Release, scan confirmation and blocked-state handling run on detail/action pages."
      toolbar={
        <Button variant="secondary" size="icon" onClick={() => void query.refetch()} aria-label="Refresh putaway list">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Warehouse filter
            <Input
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
              placeholder="warehouse-a"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Task status filter
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TaskStatusFilter)}
            >
              <option value="All">All</option>
              {PUTAWAY_TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      state={state}
      stateTitle={
        state === 'forbidden'
          ? 'Permission denied'
          : state === 'error'
            ? 'Unable to load putaway tasks'
            : state === 'empty'
              ? 'No putaway tasks'
              : undefined
      }
      stateMessage={
        state === 'forbidden'
          ? apiError?.message
          : state === 'error'
            ? query.error instanceof Error
              ? query.error.message
              : 'Unable to load putaway tasks.'
            : state === 'empty'
              ? 'No putaway tasks match the current filters.'
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
