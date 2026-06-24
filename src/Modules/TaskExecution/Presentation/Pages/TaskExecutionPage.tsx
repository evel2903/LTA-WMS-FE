import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Smartphone } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { cn } from '@shared/Utils/Cn';
import { useMobileTasks } from '@modules/TaskExecution/Application/Queries/UseMobileTasks';
import {
  MOBILE_TASK_STATUSES,
  MOBILE_TASK_TYPES,
} from '@modules/TaskExecution/Domain/Constants/MobileTaskConstants';
import type {
  MobileTask,
  MobileTaskStatus,
  MobileTaskType,
} from '@modules/TaskExecution/Domain/Types/MobileTask';

type TaskTypeFilter = 'All' | MobileTaskType;
type TaskStatusFilter = 'All' | MobileTaskStatus;

function taskPayloadText(task: MobileTask): string {
  if (!task.taskPayload || Object.keys(task.taskPayload).length === 0) return 'No task payload';
  return Object.entries(task.taskPayload)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');
}

function StatusBadge({ status }: { status: MobileTaskStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function TaskCard({ task }: { task: MobileTask }) {
  return (
    <Link
      to={ROUTES.MOBILE.TASK_DETAIL(task.id)}
      aria-label={`${task.taskCode} ${task.taskType} ${task.taskStatus}`}
      className={cn('block w-full rounded-md border p-4 text-left transition-colors hover:bg-muted/60')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{task.taskCode}</div>
          <div className="text-muted-foreground text-sm">
            {task.taskType} - {task.warehouseCode}
          </div>
        </div>
        <StatusBadge status={task.taskStatus} />
      </div>
      <div className="text-muted-foreground mt-3 line-clamp-2 text-xs">
        {task.sourceDocumentCode ?? task.sourceDocumentType ?? 'No source document'}
      </div>
      <div className="text-muted-foreground mt-2 line-clamp-2 text-xs">
        {taskPayloadText(task)}
      </div>
    </Link>
  );
}

export function TaskExecutionPage() {
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeFilter>('All');
  const [taskStatus, setTaskStatus] = useState<TaskStatusFilter>('All');

  const warehouseId = useDebouncedValue(warehouseFilter, 250);
  const query = useMobileTasks({
    warehouseId: warehouseId || undefined,
    taskType: taskType === 'All' ? undefined : taskType,
    taskStatus: taskStatus === 'All' ? undefined : taskStatus,
  });

  const tasks = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = apiError?.isForbidden
    ? 'forbidden'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : tasks.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Mobile tasks"
      description="Scan, filter and open one RF/PWA task before claiming, releasing or recording scan evidence."
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : query.error
            ? 'Unable to load mobile tasks'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for mobile task read.'
          : query.error
            ? 'The mobile task list could not be loaded.'
            : 'No mobile tasks match the current filters.'
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Warehouse filter
            <Input
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
              placeholder="warehouse-a"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Task type filter
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as TaskTypeFilter)}
            >
              <option value="All">All</option>
              {MOBILE_TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Task status filter
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={taskStatus}
              onChange={(event) => setTaskStatus(event.target.value as TaskStatusFilter)}
            >
              <option value="All">All</option>
              {MOBILE_TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading mobile tasks
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Smartphone className="size-3.5" />
        Claim, release and scan actions are handled on the task detail route.
      </div>
    </ListPageShell>
  );
}
