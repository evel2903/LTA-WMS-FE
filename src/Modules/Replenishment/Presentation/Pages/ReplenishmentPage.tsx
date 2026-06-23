import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, PackagePlus, RefreshCw, Send, XCircle } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Input } from '@shared/Components/Ui/Input';
import {
  INVENTORY_RECONCILIATION_RETRY_STATUSES,
  REPLENISHMENT_TASK_STATUSES,
  REPLENISHMENT_TRIGGER_TYPES,
} from '@modules/Replenishment/Domain/Constants/ReplenishmentConstants';
import { useReplenishmentMutations } from '@modules/Replenishment/Application/Commands/UseReplenishmentMutations';
import { useReplenishmentTasks } from '@modules/Replenishment/Application/Queries/UseReplenishmentTasks';
import type {
  InventoryReconciliationRetryStatus,
  ReplenishmentTask,
  ReplenishmentTaskStatus,
  ReplenishmentTriggerType,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';

type StatusFilter = 'All' | ReplenishmentTaskStatus;

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
  return 'Không thể hoàn tất thao tác replenishment.';
}

function StatusBadge({ status }: { status: ReplenishmentTaskStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function TaskRow({ task, onSelect }: { task: ReplenishmentTask; onSelect: (task: ReplenishmentTask) => void }) {
  return (
    <button
      type="button"
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
      onClick={() => onSelect(task)}
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
        <div>Source: {task.sourceBalanceId}</div>
        <div>Target: {task.targetLocationCode ?? task.targetLocationId}</div>
        <div>Trigger: {task.triggerType}</div>
      </div>
    </button>
  );
}

export function ReplenishmentPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [triggerType, setTriggerType] = useState<ReplenishmentTriggerType>('MinMax');
  const [sourceBalanceId, setSourceBalanceId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [shortPickReference, setShortPickReference] = useState('');
  const [releaseReasonCode, setReleaseReasonCode] = useState('RC-V1-REPLENISHMENT');
  const [movementReasonCode, setMovementReasonCode] = useState('RC-V1-ADJUSTMENT');
  const [cancelReasonCode, setCancelReasonCode] = useState('RC-V1-REPLENISHMENT');
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [businessReference, setBusinessReference] = useState('');
  const [reconciliationEventType, setReconciliationEventType] = useState('InventoryReconciliationFailed');
  const [retryStatus, setRetryStatus] = useState<InventoryReconciliationRetryStatus>('PendingRetry');
  const [errorText, setErrorText] = useState('');
  const [payloadText, setPayloadText] = useState('');
  const [payloadError, setPayloadError] = useState('');

  const hasScopeFilter = warehouseId.trim().length > 0 || ownerId.trim().length > 0;
  const query = useReplenishmentTasks(
    {
      warehouseId: warehouseId.trim() || undefined,
      ownerId: ownerId.trim() || undefined,
      taskStatus: statusFilter === 'All' ? undefined : statusFilter,
    },
    { enabled: hasScopeFilter },
  );
  const mutations = useReplenishmentMutations();
  const tasks = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const selected = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const parsedQuantity = Number(quantity);
  const hasIdempotencyKey = idempotencyKey.trim().length > 0;
  const releaseEvidence = evidence(evidenceRefs);
  const canRelease =
    sourceBalanceId.trim().length > 0 &&
    targetLocationId.trim().length > 0 &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    releaseReasonCode.trim().length > 0 &&
    hasIdempotencyKey;
  const canMutateSelected = selectedTaskId.trim().length > 0 && movementReasonCode.trim().length > 0 && hasIdempotencyKey;
  const canCancelSelected = selectedTaskId.trim().length > 0 && cancelReasonCode.trim().length > 0 && hasIdempotencyKey;
  const canRecordFailure =
    businessReference.trim().length > 0 &&
    reconciliationEventType.trim().length > 0 &&
    warehouseId.trim().length > 0 &&
    errorText.trim().length > 0 &&
    releaseEvidence.length > 0 &&
    hasIdempotencyKey;
  const listError = errorMessage(query.error);
  const releaseError = errorMessage(mutations.releaseTask.error);
  const confirmError = errorMessage(mutations.confirmTask.error);
  const cancelError = errorMessage(mutations.cancelTask.error);
  const failureError = errorMessage(mutations.recordReconciliationFailure.error);

  const selectTask = (task: ReplenishmentTask) => {
    setSelectedTaskId(task.id);
    setSourceBalanceId(task.sourceBalanceId);
    setTargetLocationId(task.targetLocationId);
    setQuantity(String(task.quantity));
    setShortPickReference(task.shortPickReference ?? '');
  };

  const commonReason = {
    reasonNote: reasonNote.trim() || undefined,
    evidenceRefs: releaseEvidence,
    idempotencyKey: idempotencyKey.trim(),
  };

  const handleRelease = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutations.releaseTask.mutate(
      {
        triggerType,
        sourceBalanceId: sourceBalanceId.trim(),
        targetLocationId: targetLocationId.trim(),
        quantity: parsedQuantity,
        shortPickReference: shortPickReference.trim() || undefined,
        reasonCode: releaseReasonCode.trim(),
        ...commonReason,
      },
      {
        onSuccess: (result) => {
          setSelectedTaskId(result.replenishmentTask.id);
          setIdempotencyKey('');
        },
      },
    );
  };

  const handleConfirm = () => {
    mutations.confirmTask.mutate(
      {
        id: selectedTaskId.trim(),
        payload: { reasonCode: movementReasonCode.trim(), ...commonReason },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleCancel = () => {
    mutations.cancelTask.mutate(
      {
        id: selectedTaskId.trim(),
        payload: { reasonCode: cancelReasonCode.trim(), ...commonReason },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleRecordFailure = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let payload: Record<string, unknown> | undefined;
    if (payloadText.trim()) {
      try {
        payload = JSON.parse(payloadText) as Record<string, unknown>;
        setPayloadError('');
      } catch {
        setPayloadError('Payload phải là JSON hợp lệ.');
        return;
      }
    }
    mutations.recordReconciliationFailure.mutate(
      {
        businessReference: businessReference.trim(),
        eventType: reconciliationEventType.trim(),
        warehouseId: warehouseId.trim(),
        ownerId: ownerId.trim() || undefined,
        errorMessage: errorText.trim(),
        retryStatus,
        reasonCode: 'RC-V1-DEAD-LETTER-FIX',
        evidenceRefs: releaseEvidence,
        idempotencyKey: idempotencyKey.trim(),
        payload,
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="space-y-4">
        <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Warehouse
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Owner
            <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="All">All</option>
              {REPLENISHMENT_TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!hasScopeFilter ? (
            <div className="text-muted-foreground text-sm">Enter warehouse or owner to load replenishment tasks.</div>
          ) : query.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" />
              Loading replenishment tasks
            </div>
          ) : query.error ? (
            <div className="text-destructive text-sm">{listError}</div>
          ) : tasks.length === 0 ? (
            <div className="text-muted-foreground text-sm">No replenishment tasks match the filters.</div>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} onSelect={selectTask} />)
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <form className="space-y-3 rounded-md border p-4" onSubmit={handleRelease}>
          <div className="flex items-center gap-2 font-semibold">
            <PackagePlus className="size-4" />
            Release replenishment
          </div>
          <label className="grid gap-1 text-sm">
            Trigger
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={triggerType}
              onChange={(event) => setTriggerType(event.target.value as ReplenishmentTriggerType)}
            >
              {REPLENISHMENT_TRIGGER_TYPES.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {trigger}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Source balance id
            <Input value={sourceBalanceId} onChange={(event) => setSourceBalanceId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Target location id
            <Input value={targetLocationId} onChange={(event) => setTargetLocationId(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Quantity
              <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
            </label>
            <label className="grid gap-1 text-sm">
              Short pick reference
              <Input value={shortPickReference} onChange={(event) => setShortPickReference(event.target.value)} />
            </label>
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            disabled={!canRelease || mutations.releaseTask.isPending}
          >
            <Send className="size-4" />
            Release task
          </button>
          {releaseError && <p className="text-destructive text-sm">{releaseError}</p>}
        </form>

        <div className="space-y-3 rounded-md border p-4">
          <div className="font-semibold">Task lifecycle</div>
          <label className="grid gap-1 text-sm">
            Selected task id
            <Input value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)} />
          </label>
          {selected && (
            <div className="text-muted-foreground text-xs">
              {selected.taskCode} - {selected.taskStatus} - {selected.sourceInventoryStatusCode}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              disabled={!canMutateSelected || mutations.confirmTask.isPending}
              onClick={handleConfirm}
            >
              <CheckCircle2 className="size-4" />
              Confirm
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              disabled={!canCancelSelected || mutations.cancelTask.isPending}
              onClick={handleCancel}
            >
              <XCircle className="size-4" />
              Cancel
            </button>
          </div>
          {(confirmError || cancelError) && (
            <p className="text-destructive text-sm">{confirmError ?? cancelError}</p>
          )}
        </div>

        <form className="space-y-3 rounded-md border p-4" onSubmit={handleRecordFailure}>
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" />
            Reconciliation failure
          </div>
          <label className="grid gap-1 text-sm">
            Business reference
            <Input value={businessReference} onChange={(event) => setBusinessReference(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Event type
              <Input
                value={reconciliationEventType}
                onChange={(event) => setReconciliationEventType(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Retry status
              <select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                value={retryStatus}
                onChange={(event) => setRetryStatus(event.target.value as InventoryReconciliationRetryStatus)}
              >
                {INVENTORY_RECONCILIATION_RETRY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Error message
            <Input value={errorText} onChange={(event) => setErrorText(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Payload JSON
            <textarea
              className="min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm"
              value={payloadText}
              onChange={(event) => {
                setPayloadText(event.target.value);
                setPayloadError('');
              }}
            />
          </label>
          {payloadError && <p className="text-destructive text-sm">{payloadError}</p>}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            disabled={!canRecordFailure || mutations.recordReconciliationFailure.isPending}
          >
            <Send className="size-4" />
            Record failure
          </button>
          {failureError && <p className="text-destructive text-sm">{failureError}</p>}
        </form>

        <div className="space-y-3 rounded-md border p-4">
          <div className="font-semibold">Reason and evidence</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Release reason
              <Input value={releaseReasonCode} onChange={(event) => setReleaseReasonCode(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Movement reason
              <Input value={movementReasonCode} onChange={(event) => setMovementReasonCode(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Cancel reason
              <Input value={cancelReasonCode} onChange={(event) => setCancelReasonCode(event.target.value)} />
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
        </div>
      </aside>
    </div>
  );
}
