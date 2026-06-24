import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Loader2, MapPin, RefreshCw, ScanLine, Send, Warehouse } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { usePutawayMutations } from '@modules/Putaway/Application/Commands/UsePutawayMutations';
import { usePutawayTask } from '@modules/Putaway/Application/Queries/UsePutawayTasks';
import type {
  ConfirmPutawayTaskResult,
  PutawayTask,
} from '@modules/Putaway/Domain/Types/PutawayTask';

function jsonLine(value: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) return 'No constraints';
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(' | ');
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unable to complete putaway request.';
}

function putawayErrorMessage(error: unknown): string | null {
  const message = errorMessage(error);
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') {
    return message;
  }
  const details = error.details as {
    Reason?: unknown;
    ScanResults?: Array<{
      ScanType?: unknown;
      RawValue?: unknown;
      ExpectedValue?: unknown;
      Result?: unknown;
    }>;
  };
  const rejectedScans = details.ScanResults?.filter((scan) => scan.Result === 'Rejected') ?? [];
  if (rejectedScans.length > 0) {
    const scanSummary = rejectedScans
      .map((scan) => {
        const scanType = typeof scan.ScanType === 'string' ? scan.ScanType : 'Scan';
        const expected = typeof scan.ExpectedValue === 'string' ? scan.ExpectedValue : 'not set';
        const raw = typeof scan.RawValue === 'string' ? scan.RawValue : 'empty';
        return `${scanType} expected ${expected}, got ${raw}`;
      })
      .join('; ');
    return message ? `${message}: ${scanSummary}` : scanSummary;
  }
  if (typeof details.Reason === 'string') {
    return message ? `${message}: ${details.Reason}` : details.Reason;
  }
  return message;
}

const PUTAWAY_ALLOWED_ACTIONS = new Set(['confirm']);

export function PutawayDetailPage() {
  const { id: routeTaskId, action: routeAction } = useParams<{ id: string; action: string }>();
  const navigate = useNavigate();
  const [inboundReleaseId, setInboundReleaseId] = useState('');
  const [sourceLocationCode, setSourceLocationCode] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [priority, setPriority] = useState('50');
  const [workPoolCode, setWorkPoolCode] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [latestTask, setLatestTask] = useState<PutawayTask | null>(null);
  const [confirmTaskId, setConfirmTaskId] = useState(routeTaskId ?? '');
  const [confirmSourceScan, setConfirmSourceScan] = useState('');
  const [confirmTargetScan, setConfirmTargetScan] = useState('');
  const [confirmLpnScan, setConfirmLpnScan] = useState('');
  const [confirmQuantity, setConfirmQuantity] = useState('');
  const [confirmReasonCode, setConfirmReasonCode] = useState('');
  const [confirmReasonNote, setConfirmReasonNote] = useState('');
  const [confirmEvidenceRefs, setConfirmEvidenceRefs] = useState('');
  const [confirmDeviceCode, setConfirmDeviceCode] = useState('');
  const [confirmSessionId, setConfirmSessionId] = useState('');
  const [confirmIdempotencyKey, setConfirmIdempotencyKey] = useState('');
  const [latestConfirm, setLatestConfirm] = useState<ConfirmPutawayTaskResult | null>(null);

  const detailQuery = usePutawayTask(routeTaskId ?? null);
  const mutations = usePutawayMutations();

  const latestTaskForRoute = latestTask?.id === routeTaskId ? latestTask : null;
  const selectedTask = useMemo(
    () => latestTaskForRoute ?? detailQuery.data ?? null,
    [detailQuery.data, latestTaskForRoute],
  );
  const effectiveConfirmTaskId = routeTaskId ?? confirmTaskId;
  const canRelease = inboundReleaseId.trim().length > 0 && idempotencyKey.trim().length > 0;
  const confirmQuantityProvided = confirmQuantity.trim().length > 0;
  const parsedConfirmQuantity = Number(confirmQuantity);
  const confirmQuantityValid =
    !confirmQuantityProvided ||
    (Number.isFinite(parsedConfirmQuantity) && parsedConfirmQuantity > 0);
  const canConfirm =
    effectiveConfirmTaskId.trim().length > 0 &&
    confirmSourceScan.trim().length > 0 &&
    confirmTargetScan.trim().length > 0 &&
    confirmIdempotencyKey.trim().length > 0 &&
    confirmQuantityValid;
  const releaseError = errorMessage(mutations.releaseTask.error);
  const confirmError = putawayErrorMessage(mutations.confirmTask.error);
  const detailError = errorMessage(detailQuery.error);

  useEffect(() => {
    if (routeTaskId) {
      setConfirmTaskId(routeTaskId);
      setConfirmIdempotencyKey(`${routeTaskId}:CONFIRM:001`);
      setLatestConfirm(null);
    }
  }, [routeTaskId]);

  const handleRelease = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLatestTask(null);
    mutations.releaseTask.mutate(
      {
        inboundPutawayReleaseId: inboundReleaseId.trim(),
        sourceLocationCode: sourceLocationCode.trim() || undefined,
        targetLocationId: targetLocationId.trim() || undefined,
        priority: Number(priority) || undefined,
        workPoolCode: workPoolCode.trim() || undefined,
        reasonCode: reasonCode.trim() || undefined,
        reasonNote: reasonNote.trim() || undefined,
        evidenceRefs: evidenceRefs
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        idempotencyKey: idempotencyKey.trim(),
      },
      {
        onSuccess: (task) => {
          setLatestTask(task);
          void navigate(ROUTES.PUTAWAY.DETAIL(task.id));
        },
      },
    );
  };

  const selectTaskForConfirm = (task: PutawayTask) => {
    setConfirmTaskId(task.id);
    setConfirmSourceScan('');
    setConfirmTargetScan('');
    setConfirmLpnScan('');
    setConfirmQuantity('');
    setConfirmReasonCode('');
    setConfirmReasonNote('');
    setConfirmEvidenceRefs('');
    setConfirmDeviceCode('');
    setConfirmSessionId('');
    setConfirmIdempotencyKey(`${task.taskCode}:CONFIRM:001`);
  };

  const handleConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLatestConfirm(null);
    mutations.confirmTask.mutate(
      {
        taskId: effectiveConfirmTaskId.trim(),
        payload: {
          sourceLocationScan: confirmSourceScan.trim(),
          targetLocationScan: confirmTargetScan.trim(),
          lpnScan: confirmLpnScan.trim() || undefined,
          confirmedQuantity: confirmQuantityProvided ? parsedConfirmQuantity : undefined,
          reasonCode: confirmReasonCode.trim() || undefined,
          reasonNote: confirmReasonNote.trim() || undefined,
          evidenceRefs: confirmEvidenceRefs
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          deviceCode: confirmDeviceCode.trim() || undefined,
          sessionId: confirmSessionId.trim() || undefined,
          idempotencyKey: confirmIdempotencyKey.trim(),
        },
      },
      { onSuccess: setLatestConfirm },
    );
  };

  if (routeAction && routeTaskId && !PUTAWAY_ALLOWED_ACTIONS.has(routeAction)) {
    return <Navigate to={ROUTES.PUTAWAY.DETAIL(routeTaskId)} replace />;
  }

  if (routeTaskId && detailQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Putaway task detail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">{detailError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Putaway task detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading putaway task
              </div>
            ) : detailQuery.error ? (
              <p className="text-destructive text-sm">{detailError}</p>
            ) : selectedTask ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border px-2 py-1 text-xs font-medium">
                    {selectedTask.taskStatus}
                  </span>
                  <span className="text-muted-foreground text-sm">{selectedTask.taskCode}</span>
                </div>
                <dl className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground">SKU</dt>
                    <dd>
                      {selectedTask.skuCode ?? selectedTask.skuId} - {selectedTask.quantity}{' '}
                      {selectedTask.uomCode ?? ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Inventory status</dt>
                    <dd>{selectedTask.inventoryStatusCode}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Source</dt>
                    <dd>{selectedTask.sourceLocationCode ?? 'not set'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Target</dt>
                    <dd>{selectedTask.targetLocationCode}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">LPN</dt>
                    <dd>{selectedTask.lpnCode ?? 'not set'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Mobile task</dt>
                    <dd>{selectedTask.mobileTaskId ?? 'not created'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-foreground">Constraints</dt>
                    <dd>{jsonLine(selectedTask.constraintJson)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  onClick={() => selectTaskForConfirm(selectedTask)}
                >
                  <ScanLine className="size-4" />
                  Use for confirm
                </button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Open a task from the putaway list.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="size-4" />
              <CardTitle className="text-base">Release putaway task</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleRelease}>
              <label className="grid gap-1 text-sm">
                Inbound putaway release id
                <Input
                  value={inboundReleaseId}
                  onChange={(event) => setInboundReleaseId(event.target.value)}
                  placeholder="inbound-release-1"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Source location code
                <Input
                  value={sourceLocationCode}
                  onChange={(event) => setSourceLocationCode(event.target.value)}
                  placeholder="RCV-STG-01"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Target location id
                <Input
                  value={targetLocationId}
                  onChange={(event) => setTargetLocationId(event.target.value)}
                  placeholder="optional directed target"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  Priority
                  <Input value={priority} onChange={(event) => setPriority(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  Work pool
                  <Input
                    value={workPoolCode}
                    onChange={(event) => setWorkPoolCode(event.target.value)}
                    placeholder="PUTAWAY-WT01"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Reason code
                <Input
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  placeholder="RC-V1-OVERRIDE"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Reason note
                <Input
                  value={reasonNote}
                  onChange={(event) => setReasonNote(event.target.value)}
                  placeholder="Optional release note"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Evidence refs
                <textarea
                  className="min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={evidenceRefs}
                  onChange={(event) => setEvidenceRefs(event.target.value)}
                  placeholder="scan://rf/lpn-000001"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Idempotency key
                <Input
                  value={idempotencyKey}
                  onChange={(event) => setIdempotencyKey(event.target.value)}
                  placeholder="ASN-10001:10:PUTAWAY-001"
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canRelease || mutations.releaseTask.isPending}
              >
                {mutations.releaseTask.isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Release putaway task
              </button>
              {releaseError && <p className="text-destructive text-sm">{releaseError}</p>}
            </form>

            {latestTaskForRoute && (
              <div className="mt-4 rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="size-4" />
                  {latestTaskForRoute.taskCode} released
                </div>
                <div className="text-muted-foreground mt-2 space-y-1">
                  <div>Target: {latestTaskForRoute.targetLocationCode}</div>
                  <div>Source: {latestTaskForRoute.sourceLocationCode ?? 'not set'}</div>
                  <div>Outbox: {latestTaskForRoute.outboxMessageId ?? 'not emitted'}</div>
                  <div>Constraints: {jsonLine(latestTaskForRoute.constraintJson)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScanLine className="size-4" />
              <CardTitle className="text-base">Confirm putaway scan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleConfirm}>
              <label className="grid gap-1 text-sm">
                Confirm task id
                <Input
                  value={confirmTaskId}
                  onChange={(event) => setConfirmTaskId(event.target.value)}
                  readOnly={Boolean(routeTaskId)}
                  placeholder="putaway-task-id"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="grid gap-1 text-sm">
                  Source scan
                  <Input
                    value={confirmSourceScan}
                    onChange={(event) => setConfirmSourceScan(event.target.value)}
                    placeholder="RCV-STG-01"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Target scan
                  <Input
                    value={confirmTargetScan}
                    onChange={(event) => setConfirmTargetScan(event.target.value)}
                    placeholder="A-01"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  LPN or SSCC scan
                  <Input
                    value={confirmLpnScan}
                    onChange={(event) => setConfirmLpnScan(event.target.value)}
                    placeholder="LPN-001"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Confirmed qty
                  <Input
                    value={confirmQuantity}
                    onChange={(event) => setConfirmQuantity(event.target.value)}
                    placeholder="5"
                    inputMode="decimal"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  Confirm reason code
                  <Input
                    value={confirmReasonCode}
                    onChange={(event) => setConfirmReasonCode(event.target.value)}
                    placeholder="PUTAWAY_CONFIRM"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Device code
                  <Input
                    value={confirmDeviceCode}
                    onChange={(event) => setConfirmDeviceCode(event.target.value)}
                    placeholder="RF-01"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Confirm reason note
                <Input
                  value={confirmReasonNote}
                  onChange={(event) => setConfirmReasonNote(event.target.value)}
                  placeholder="Optional confirm note"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Confirm evidence refs
                <textarea
                  className="min-h-16 rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={confirmEvidenceRefs}
                  onChange={(event) => setConfirmEvidenceRefs(event.target.value)}
                  placeholder="scan://rf/confirm-001"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Session id
                <Input
                  value={confirmSessionId}
                  onChange={(event) => setConfirmSessionId(event.target.value)}
                  placeholder="session-001"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Confirm idempotency key
                <Input
                  value={confirmIdempotencyKey}
                  onChange={(event) => setConfirmIdempotencyKey(event.target.value)}
                  placeholder="PUT-001:CONFIRM:001"
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canConfirm || mutations.confirmTask.isPending}
              >
                {mutations.confirmTask.isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Confirm putaway scan
              </button>
              {confirmError && <p className="text-destructive text-sm">{confirmError}</p>}
            </form>

            {latestConfirm && (
              <div className="mt-4 rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4" />
                  {latestConfirm.putawayTask.taskCode} confirmed
                  {latestConfirm.isDuplicate ? ' (duplicate)' : ''}
                </div>
                <div className="text-muted-foreground mt-2 space-y-1">
                  <div>Transaction: {latestConfirm.inventoryTransaction.transactionCode}</div>
                  <div>Movement: {latestConfirm.inventoryMovement.movementCode}</div>
                  <div>
                    Status: {latestConfirm.inventoryTransaction.fromInventoryStatusCode} -{'>'}{' '}
                    {latestConfirm.inventoryTransaction.toInventoryStatusCode}
                  </div>
                  <div>
                    Location: {latestConfirm.inventoryTransaction.fromLocationCode ?? 'not set'} -
                    {'>'} {latestConfirm.inventoryTransaction.toLocationCode}
                  </div>
                  <div>
                    Balance: {latestConfirm.sourceBalance.qtyOnHand} source /{' '}
                    {latestConfirm.targetBalance.qtyOnHand} target
                  </div>
                  <div>Outbox: {latestConfirm.outboxMessageId ?? 'not emitted'}</div>
                  <div>
                    Scans:{' '}
                    {latestConfirm.scanResults
                      .map((scan) => `${scan.scanType}:${scan.result}`)
                      .join(', ')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
