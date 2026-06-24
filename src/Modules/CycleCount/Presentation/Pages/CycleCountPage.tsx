import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Input } from '@shared/Components/Ui/Input';
import { Button } from '@shared/Components/Ui/Button';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { CYCLE_COUNT_WORK_STATUSES } from '@modules/CycleCount/Domain/Constants/CycleCountConstants';
import { useCycleCountWorks } from '@modules/CycleCount/Application/Queries/UseCycleCountWorks';
import type { CycleCountWork, CycleCountWorkStatus } from '@modules/CycleCount/Domain/Types/CycleCountWork';

type StatusFilter = 'All' | CycleCountWorkStatus;

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Unable to load cycle count works.';
}

function StatusBadge({ status }: { status: CycleCountWorkStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
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
        <div>Balance: {work.sourceBalanceId}</div>
        <div>Locked: {work.lockedBalanceId ?? 'not locked'}</div>
        <div>Variance: {work.varianceQuantity ?? 'not submitted'}</div>
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
      title="Cycle count"
      description="Filter count work and open a focused detail/action page for lock, submit, adjustment or unlock."
      state={state}
      stateTitle={query.error ? 'Unable to load cycle count works' : undefined}
      stateMessage={
        !hasScopeFilter
          ? 'Enter a warehouse to load cycle count works.'
          : query.error
            ? listError ?? 'Unable to load cycle count works.'
            : 'No cycle count works match the filters.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.CYCLE_COUNT.NEW}>
            <Plus className="size-4" aria-hidden="true" />
            New count lock
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Warehouse
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="All">All</option>
              {CYCLE_COUNT_WORK_STATUSES.map((status) => (
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
          <RefreshCw className="size-4 animate-spin" />
          Loading cycle count works
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
