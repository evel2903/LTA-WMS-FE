import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Smartphone } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
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
  if (!task.taskPayload || Object.keys(task.taskPayload).length === 0) return 'Chưa có payload tác vụ';
  return Object.entries(task.taskPayload)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');
}

function StatusBadge({ status }: { status: MobileTaskStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
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
            {vietnameseOperationalLabel(task.taskType)} - {task.warehouseCode}
          </div>
        </div>
        <StatusBadge status={task.taskStatus} />
      </div>
      <div className="text-muted-foreground mt-3 line-clamp-2 text-xs">
        {task.sourceDocumentCode ?? task.sourceDocumentType ?? 'Chưa có chứng từ nguồn'}
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
      title="Tác vụ mobile"
      description="Quét, lọc và mở từng tác vụ RF/PWA trước khi nhận, nhả hoặc ghi nhận bằng chứng quét."
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : query.error
            ? 'Không thể tải tác vụ mobile'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem tác vụ mobile.'
          : query.error
            ? 'Không thể tải danh sách tác vụ mobile.'
            : 'Không có tác vụ mobile nào khớp bộ lọc hiện tại.'
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Lọc kho
            <Input
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
              placeholder="warehouse-a"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Lọc loại tác vụ
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as TaskTypeFilter)}
            >
              <option value="All">Tất cả</option>
              {MOBILE_TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {vietnameseOperationalLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Lọc trạng thái tác vụ
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={taskStatus}
              onChange={(event) => setTaskStatus(event.target.value as TaskStatusFilter)}
            >
              <option value="All">Tất cả</option>
              {MOBILE_TASK_STATUSES.map((status) => (
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
          <Loader2 className="size-4 animate-spin" />
          Đang tải tác vụ mobile
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
        Nhận, nhả và quét được xử lý ở tuyến chi tiết tác vụ.
      </div>
    </ListPageShell>
  );
}
