import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ClipboardCheck, LockKeyhole, RefreshCw, RotateCcw, Send, UnlockKeyhole } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Input } from '@shared/Components/Ui/Input';
import { CYCLE_COUNT_WORK_STATUSES } from '@modules/CycleCount/Domain/Constants/CycleCountConstants';
import { useCycleCountMutations } from '@modules/CycleCount/Application/Commands/UseCycleCountMutations';
import { useCycleCountWorks } from '@modules/CycleCount/Application/Queries/UseCycleCountWorks';
import type { CycleCountWork, CycleCountWorkStatus } from '@modules/CycleCount/Domain/Types/CycleCountWork';

type StatusFilter = 'All' | CycleCountWorkStatus;

function evidence(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Không thể hoàn tất thao tác cycle count.';
}

function StatusBadge({ status }: { status: CycleCountWorkStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function WorkRow({ work, onSelect }: { work: CycleCountWork; onSelect: (work: CycleCountWork) => void }) {
  return (
    <button
      type="button"
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
      onClick={() => onSelect(work)}
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
    </button>
  );
}

export function CycleCountPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [sourceBalanceId, setSourceBalanceId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [toleranceQuantity, setToleranceQuantity] = useState('0');
  const [countedQuantity, setCountedQuantity] = useState('');
  const [approvalRequestId, setApprovalRequestId] = useState('');
  const [reasonCode, setReasonCode] = useState('RC-V1-HOLD-RELEASE');
  const [adjustReasonCode, setAdjustReasonCode] = useState('RC-V1-ADJUSTMENT');
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const hasScopeFilter = warehouseId.trim().length > 0;
  const query = useCycleCountWorks(
    {
      warehouseId: warehouseId.trim() || undefined,
      workStatus: statusFilter === 'All' ? undefined : statusFilter,
    },
    { enabled: hasScopeFilter },
  );
  const mutations = useCycleCountMutations();
  const works = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const selected = works.find((work) => work.id === selectedWorkId) ?? null;
  const parsedQuantity = Number(quantity);
  const parsedTolerance = Number(toleranceQuantity);
  const parsedCounted = Number(countedQuantity);
  const hasIdempotencyKey = idempotencyKey.trim().length > 0;
  const canCreate =
    sourceBalanceId.trim().length > 0 &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    hasIdempotencyKey;
  const canSubmit =
    selectedWorkId.trim().length > 0 &&
    Number.isFinite(parsedCounted) &&
    parsedCounted >= 0 &&
    hasIdempotencyKey;
  const commonPayload = {
    reasonCode: reasonCode.trim(),
    reasonNote: reasonNote.trim() || undefined,
    evidenceRefs: evidence(evidenceRefs),
    idempotencyKey: idempotencyKey.trim(),
  };
  const createError = errorMessage(mutations.createWork.error);
  const submitError = errorMessage(mutations.submitWork.error);
  const adjustError = errorMessage(mutations.postAdjustment.error);
  const unlockError = errorMessage(mutations.unlockWork.error);
  const recountError = errorMessage(mutations.recountWork.error);
  const listError = errorMessage(query.error);

  const selectWork = (work: CycleCountWork) => {
    setSelectedWorkId(work.id);
    setSourceBalanceId(work.sourceBalanceId);
    setQuantity(String(work.expectedQuantity));
    setToleranceQuantity(String(work.toleranceQuantity));
    setCountedQuantity(work.countedQuantity === null ? '' : String(work.countedQuantity));
    setApprovalRequestId(work.approvalRequestId ?? '');
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutations.createWork.mutate(
      {
        sourceBalanceId: sourceBalanceId.trim(),
        quantity: parsedQuantity,
        toleranceQuantity: Number.isFinite(parsedTolerance) ? parsedTolerance : 0,
        ...commonPayload,
      },
      {
        onSuccess: (result) => {
          setSelectedWorkId(result.cycleCountWork.id);
          setIdempotencyKey('');
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutations.submitWork.mutate(
      {
        id: selectedWorkId.trim(),
        payload: {
          countedQuantity: parsedCounted,
          approvalRequestId: approvalRequestId.trim() || undefined,
          ...commonPayload,
        },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleRecount = () => {
    mutations.recountWork.mutate(
      { id: selectedWorkId.trim(), payload: commonPayload },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleAdjustment = () => {
    mutations.postAdjustment.mutate(
      {
        id: selectedWorkId.trim(),
        payload: {
          reasonCode: adjustReasonCode.trim(),
          reasonNote: reasonNote.trim() || undefined,
          evidenceRefs: evidence(evidenceRefs),
          approvalRequestId: approvalRequestId.trim() || undefined,
          idempotencyKey: idempotencyKey.trim(),
        },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleUnlock = () => {
    mutations.unlockWork.mutate(
      { id: selectedWorkId.trim(), payload: commonPayload },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-4">
        <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!hasScopeFilter ? (
            <div className="text-muted-foreground text-sm">Enter a warehouse to load cycle count works.</div>
          ) : query.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" />
              Loading cycle count works
            </div>
          ) : query.error ? (
            <div className="text-destructive text-sm">{listError}</div>
          ) : works.length === 0 ? (
            <div className="text-muted-foreground text-sm">No cycle count works match the filters.</div>
          ) : (
            works.map((work) => <WorkRow key={work.id} work={work} onSelect={selectWork} />)
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <form className="space-y-3 rounded-md border p-4" onSubmit={handleCreate}>
          <div className="flex items-center gap-2 font-semibold">
            <LockKeyhole className="size-4" />
            Lock count work
          </div>
          <label className="grid gap-1 text-sm">
            Source balance id
            <Input value={sourceBalanceId} onChange={(event) => setSourceBalanceId(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Quantity
              <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
            </label>
            <label className="grid gap-1 text-sm">
              Tolerance
              <Input
                value={toleranceQuantity}
                onChange={(event) => setToleranceQuantity(event.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            disabled={!canCreate || mutations.createWork.isPending}
          >
            <Send className="size-4" />
            Create lock
          </button>
          {createError && <p className="text-destructive text-sm">{createError}</p>}
        </form>

        <form className="space-y-3 rounded-md border p-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="size-4" />
            Submit and govern
          </div>
          <label className="grid gap-1 text-sm">
            Work id
            <Input value={selectedWorkId} onChange={(event) => setSelectedWorkId(event.target.value)} />
          </label>
          {selected && (
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              {selected.countCode} / {selected.workStatus} / expected {selected.expectedQuantity}
            </div>
          )}
          <label className="grid gap-1 text-sm">
            Counted quantity
            <Input
              value={countedQuantity}
              onChange={(event) => setCountedQuantity(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Approval request id
            <Input value={approvalRequestId} onChange={(event) => setApprovalRequestId(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Reason
              <Input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Adjust reason
              <Input value={adjustReasonCode} onChange={(event) => setAdjustReasonCode(event.target.value)} />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Reason note
            <Input value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Evidence refs
            <textarea
              className="min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm"
              value={evidenceRefs}
              onChange={(event) => setEvidenceRefs(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Idempotency key
            <Input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
          </label>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            disabled={!canSubmit || mutations.submitWork.isPending}
          >
            <ClipboardCheck className="size-4" />
            Submit count
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              disabled={!selectedWorkId || !hasIdempotencyKey || mutations.recountWork.isPending}
              onClick={handleRecount}
            >
              <RotateCcw className="size-3.5" />
              Recount
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              disabled={!selectedWorkId || !hasIdempotencyKey || mutations.postAdjustment.isPending}
              onClick={handleAdjustment}
            >
              <Send className="size-3.5" />
              Adjust
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              disabled={!selectedWorkId || !hasIdempotencyKey || mutations.unlockWork.isPending}
              onClick={handleUnlock}
            >
              <UnlockKeyhole className="size-3.5" />
              Unlock
            </button>
          </div>
          {[submitError, recountError, adjustError, unlockError].filter(Boolean).map((message) => (
            <p key={message} className="text-destructive text-sm">
              {message}
            </p>
          ))}
        </form>
      </aside>
    </div>
  );
}
