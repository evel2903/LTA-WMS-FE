import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Input } from '@shared/Components/Ui/Input';
import { Button } from '@shared/Components/Ui/Button';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { CYCLE_COUNT_WORK_STATUSES } from '@modules/CycleCount/Domain/Constants/CycleCountConstants';
import { useCycleCountWorks } from '@modules/CycleCount/Application/Queries/UseCycleCountWorks';
import type { CycleCountWork, CycleCountWorkStatus } from '@modules/CycleCount/Domain/Types/CycleCountWork';

type StatusFilter = 'All' | CycleCountWorkStatus;

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể tải công việc kiểm kê chu kỳ.';
}

function StatusBadge({ status }: { status: CycleCountWorkStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function WorkRow({ work }: { work: CycleCountWork }) {
  return (
    <Link
      to={ROUTES.CYCLE_COUNT.DETAIL(work.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{work.countCode}</div>
          <div className="text-muted-foreground text-xs">
            {work.skuCode ?? work.skuId} - {work.expectedQuantity} {work.uomCode ?? ''}
          </div>
        </div>
        <StatusBadge status={work.workStatus} />
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <div>Tồn: {work.sourceBalanceId}</div>
        <div>Khóa: {work.lockedBalanceId ?? 'chưa khóa'}</div>
        <div>Chênh lệch: {work.varianceQuantity ?? 'chưa gửi'}</div>
      </div>
    </Link>
  );
}

export function CycleCountPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [warehouseId, setWarehouseId] = useState('');

  const hasScopeFilter = warehouseId.trim().length > 0;
  const query = useCycleCountWorks(
    {
      warehouseId: warehouseId.trim() || undefined,
      workStatus: statusFilter === 'All' ? undefined : statusFilter,
    },
    { enabled: hasScopeFilter },
  );
  const works = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const listError = errorMessage(query.error);
  const state = !hasScopeFilter
    ? 'empty'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : works.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Kiểm kê chu kỳ"
      description="Lọc công việc kiểm kê và mở trang chi tiết/thao tác cho khóa, gửi, điều chỉnh hoặc mở khóa."
      state={state}
      stateTitle={query.error ? 'Không thể tải công việc kiểm kê chu kỳ' : undefined}
      stateMessage={
        !hasScopeFilter
          ? 'Nhập kho để tải công việc kiểm kê chu kỳ.'
          : query.error
            ? listError ?? 'Không thể tải công việc kiểm kê chu kỳ.'
            : 'Không có công việc kiểm kê chu kỳ nào khớp bộ lọc.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.CYCLE_COUNT.NEW}>
            <Plus className="size-4" aria-hidden="true" />
            Tạo khóa kiểm kê
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Kho
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Trạng thái
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="All">Tất cả</option>
              {CYCLE_COUNT_WORK_STATUSES.map((status) => (
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
          Đang tải công việc kiểm kê chu kỳ
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => (
            <WorkRow key={work.id} work={work} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}
