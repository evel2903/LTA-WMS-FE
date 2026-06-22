import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Smartphone } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { cn } from '@shared/Utils/Cn';
import { useCurrentUser } from '@modules/Auth/Application/UseCases/UseCurrentUser';
import { useMobileTaskMutations } from '@modules/TaskExecution/Application/Commands/UseMobileTaskMutations';
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

function TaskCard({
  task,
  active,
  onSelect,
}: {
  task: MobileTask;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${task.taskCode} ${task.taskType} ${task.taskStatus}`}
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border p-4 text-left transition-colors',
        active ? 'border-primary bg-primary/5' : 'hover:bg-muted/60',
      )}
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
    </button>
  );
}

export function TaskExecutionPage() {
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeFilter>('All');
  const [taskStatus, setTaskStatus] = useState<TaskStatusFilter>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState('');

  const warehouseId = useDebouncedValue(warehouseFilter, 250);
  const query = useMobileTasks({
    warehouseId: warehouseId || undefined,
    taskType: taskType === 'All' ? undefined : taskType,
    taskStatus: taskStatus === 'All' ? undefined : taskStatus,
  });
  const mutations = useMobileTaskMutations();
  const currentUser = useCurrentUser();

  const tasks = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const selected = tasks.find((task) => task.id === selectedId) ?? tasks[0] ?? null;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const denied = Boolean(apiError?.isForbidden);
  const canClaim = Boolean(
    selected && selected.taskStatus === 'Released' && !selected.assignedUserId,
  );
  const canRelease = Boolean(
    selected &&
    ['Claimed', 'InProgress'].includes(selected.taskStatus) &&
    selected.assignedUserId &&
    selected.assignedUserId === currentUser?.id,
  );

  useEffect(() => {
    if (!selectedId && tasks[0]) {
      setSelectedId(tasks[0].id);
    }
    if (selectedId && !tasks.some((task) => task.id === selectedId)) {
      setSelectedId(tasks[0]?.id ?? null);
    }
  }, [selectedId, tasks]);

  if (denied) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mobile tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Permission denied for mobile task read.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4">
        <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-3">
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {query.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading mobile tasks
            </div>
          ) : query.error ? (
            <div className="text-destructive text-sm">Unable to load mobile tasks.</div>
          ) : tasks.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No mobile tasks match the current filters.
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                active={task.id === selected?.id}
                onSelect={() => setSelectedId(task.id)}
              />
            ))
          )}
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="size-4" />
            <CardTitle className="text-base">Scan and confirm controls</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{selected.taskCode}</div>
                    <div className="text-muted-foreground text-sm">
                      {selected.taskType} - {selected.warehouseCode}
                    </div>
                  </div>
                  <StatusBadge status={selected.taskStatus} />
                </div>
                <p className="text-muted-foreground text-sm">{taskPayloadText(selected)}</p>
              </div>

              <label className="grid gap-1 text-sm">
                Device code
                <Input
                  value={deviceCode}
                  onChange={(event) => setDeviceCode(event.target.value)}
                  placeholder="RF-01"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canClaim || mutations.claimTask.isPending}
                  onClick={() =>
                    mutations.claimTask.mutate({
                      id: selected.id,
                      input: { deviceCode: deviceCode || undefined },
                    })
                  }
                >
                  Claim task
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canRelease || mutations.releaseTask.isPending}
                  onClick={() => mutations.releaseTask.mutate(selected.id)}
                >
                  Release task
                </button>
              </div>
              {!canClaim && !canRelease && (
                <p className="text-muted-foreground text-xs">
                  Available actions depend on task state and claimant.
                </p>
              )}

              {(mutations.claimTask.isPending || mutations.releaseTask.isPending) && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <RefreshCw className="size-4 animate-spin" />
                  Updating task
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Select a mobile task to claim or release.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
