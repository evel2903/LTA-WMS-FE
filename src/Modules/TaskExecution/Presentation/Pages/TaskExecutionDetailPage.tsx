import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, RefreshCw, ScanLine, Smartphone } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { useCurrentUser } from '@modules/Auth/Application/UseCases/UseCurrentUser';
import { useMobileTaskMutations } from '@modules/TaskExecution/Application/Commands/UseMobileTaskMutations';
import { useMobileTask } from '@modules/TaskExecution/Application/Queries/UseMobileTasks';
import { MOBILE_SCAN_TYPES } from '@modules/TaskExecution/Domain/Constants/MobileTaskConstants';
import type {
  MobileScanEvent,
  MobileScanType,
  MobileTask,
  MobileTaskStatus,
} from '@modules/TaskExecution/Domain/Types/MobileTask';

const TASK_ACTIONS = new Set(['claim', 'release', 'scan', 'confirm']);
const DEFAULT_PICK_CONFIRM_REASON = 'RC-V1-DISCREPANCY';

function taskPayloadText(task: MobileTask): string {
  if (!task.taskPayload || Object.keys(task.taskPayload).length === 0) return 'No task payload';
  return Object.entries(task.taskPayload)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');
}

function StatusBadge({ status }: { status: MobileTaskStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function parsedScanText(scan: MobileScanEvent): string {
  const entries = Object.entries(scan.parsedValueJson ?? {});
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
}

function payloadValue(task: MobileTask, key: string): string | number | null {
  const value = task.taskPayload?.[key];
  if (typeof value === 'string' || typeof value === 'number') return value;
  return null;
}

function pickTaskId(task: MobileTask): string | null {
  const payloadId = payloadValue(task, 'PickTaskId');
  if (typeof payloadId === 'string' && payloadId.trim()) return payloadId;
  return task.sourceDocumentType === 'PickTask' ? task.sourceDocumentId : null;
}

function scanHasQuantity(scan: MobileScanEvent | null): boolean {
  if (!scan || scan.result !== 'Accepted') return false;
  if (scan.scanType === 'Quantity')
    return Number.isFinite(Number(scan.normalizedValue ?? scan.rawValue));
  return typeof scan.parsedValueJson?.Quantity === 'number';
}

function normalizedText(value: string | number | null): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function scanActualValue(scan: MobileScanEvent | null, key?: string): string | number | null {
  if (!scan) return null;
  if (key && typeof scan.parsedValueJson?.[key] === 'number') return scan.parsedValueJson[key];
  if (key && typeof scan.parsedValueJson?.[key] === 'string') return scan.parsedValueJson[key];
  return scan.resolvedObjectId ?? scan.normalizedValue ?? scan.rawValue;
}

function scanMatchesExpected(
  scan: MobileScanEvent | null,
  expected: string | number | null,
  key?: string,
): boolean {
  if (!scan || scan.result !== 'Accepted') return false;
  const actual = scanActualValue(scan, key);
  if (typeof expected === 'number')
    return typeof actual === 'number' && Math.abs(actual - expected) < 0.000001;
  return normalizedText(actual) === normalizedText(expected);
}

function optionalScanMatches(
  scan: MobileScanEvent | null,
  expected: string | number | null,
  key: string,
): boolean {
  if (expected === null) return true;
  return scanMatchesExpected(scan, expected, key);
}

function acceptedScanSummary(scans: Partial<Record<MobileScanType, MobileScanEvent>>): string {
  const labels = Object.entries(scans)
    .filter(([, scan]) => scan?.result === 'Accepted')
    .map(([type]) => type);
  return labels.length > 0 ? labels.join(', ') : 'No accepted scan in this session';
}

export function TaskExecutionDetailPage() {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const taskQuery = useMobileTask(id ?? null);
  const mutations = useMobileTaskMutations();
  const currentUser = useCurrentUser();
  const [deviceCode, setDeviceCode] = useState('');
  const [scanType, setScanType] = useState<MobileScanType>('Item');
  const [scanValue, setScanValue] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [confirmReasonCode, setConfirmReasonCode] = useState(DEFAULT_PICK_CONFIRM_REASON);
  const [confirmReasonNote, setConfirmReasonNote] = useState('');
  const [latestScan, setLatestScan] = useState<MobileScanEvent | null>(null);
  const [acceptedScans, setAcceptedScans] = useState<
    Partial<Record<MobileScanType, MobileScanEvent>>
  >({});
  const [lastConfirmMessage, setLastConfirmMessage] = useState<string | null>(null);

  const task = taskQuery.data ?? null;
  const apiError = taskQuery.error instanceof ApiError ? taskQuery.error : null;
  const state = !id
    ? 'notFound'
    : apiError?.isForbidden
      ? 'forbidden'
      : apiError?.status === 404
        ? 'notFound'
        : taskQuery.isLoading
          ? 'loading'
          : taskQuery.error
            ? 'error'
            : !task
              ? 'notFound'
              : null;

  const canClaim = Boolean(task && task.taskStatus === 'Released' && !task.assignedUserId);
  const canRelease = Boolean(
    task &&
    ['Claimed', 'InProgress'].includes(task.taskStatus) &&
    task.assignedUserId &&
    task.assignedUserId === currentUser?.id,
  );
  const canOperateScan = Boolean(
    task &&
    ['Claimed', 'InProgress'].includes(task.taskStatus) &&
    task.assignedUserId &&
    task.assignedUserId === currentUser?.id,
  );
  const canRecordScan = Boolean(
    task &&
    canOperateScan &&
    scanValue.trim().length > 0 &&
    (!manualEntry || reasonCode.trim().length > 0),
  );
  const currentPickTaskId = task ? pickTaskId(task) : null;
  const itemScan = acceptedScans.Item ?? null;
  const quantityScan = acceptedScans.Quantity ?? null;
  const expectedSourceLocationId = task ? payloadValue(task, 'SourceLocationId') : null;
  const expectedSkuId = task ? payloadValue(task, 'SkuId') : null;
  const expectedQuantity = task ? payloadValue(task, 'Quantity') : null;
  const expectedLot = task ? payloadValue(task, 'LotNumber') : null;
  const expectedSerial = task ? payloadValue(task, 'SerialNumber') : null;
  const expectedExpiry = task ? payloadValue(task, 'ExpiryDate') : null;
  const hasPickEvidence = Boolean(
    scanMatchesExpected(acceptedScans.Location ?? null, expectedSourceLocationId) &&
    scanMatchesExpected(itemScan, expectedSkuId) &&
    (scanMatchesExpected(quantityScan, expectedQuantity) ||
      scanMatchesExpected(itemScan, expectedQuantity, 'Quantity')) &&
    optionalScanMatches(itemScan, expectedLot, 'Lot') &&
    optionalScanMatches(itemScan, expectedSerial, 'Serial') &&
    optionalScanMatches(itemScan, expectedExpiry, 'ExpiryDate') &&
    (scanHasQuantity(quantityScan) || scanHasQuantity(itemScan)),
  );
  const canConfirmPick = Boolean(
    task &&
    task.taskType === 'Pick' &&
    currentPickTaskId &&
    canOperateScan &&
    hasPickEvidence &&
    confirmReasonCode.trim().length > 0,
  );

  useEffect(() => {
    if (action && !TASK_ACTIONS.has(action)) {
      void navigate(ROUTES.MOBILE.TASK_DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    setLatestScan(null);
    setAcceptedScans({});
    setLastConfirmMessage(null);
    setScanValue('');
    setManualEntry(false);
    setReasonCode('');
    setConfirmReasonCode(DEFAULT_PICK_CONFIRM_REASON);
    setConfirmReasonNote('');
  }, [task?.id]);

  return (
    <DetailPageShell
      title={task?.taskCode ?? 'Mobile task'}
      subtitle="RF/PWA task detail and action surface"
      backTo={ROUTES.MOBILE.TASKS}
      backLabel="Back to mobile tasks"
      status={task ? <StatusBadge status={task.taskStatus} /> : null}
      summary={
        task ? (
          <>
            <span>{task.taskType}</span>
            <span>{task.warehouseCode}</span>
            <span>
              {task.sourceDocumentCode ?? task.sourceDocumentType ?? 'No source document'}
            </span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : taskQuery.error
            ? 'Unable to load mobile task'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for mobile task detail.'
          : taskQuery.error
            ? 'The mobile task detail could not be loaded.'
            : 'The requested mobile task was not found.'
      }
    >
      {task ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid gap-1">
                  <span className="text-muted-foreground">Payload</span>
                  <span>{taskPayloadText(task)}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground">Assigned user</span>
                  <span>{task.assignedUserId ?? 'Unassigned'}</span>
                </div>
                {task.taskStatus === 'Blocked' ? (
                  <p className="text-destructive text-sm">
                    This task is blocked. Resolve the blocking rule before recording scan evidence.
                  </p>
                ) : null}
              </CardContent>
            </Card>
            {task.taskType === 'Pick' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pick execution expectation</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ['Pick task', currentPickTaskId],
                    ['Source location', payloadValue(task, 'SourceLocationId')],
                    ['Item', payloadValue(task, 'SkuCode') ?? payloadValue(task, 'SkuId')],
                    ['Quantity', payloadValue(task, 'Quantity')],
                    ['Lot', payloadValue(task, 'LotNumber')],
                    ['Serial', payloadValue(task, 'SerialNumber')],
                    ['Expiry', payloadValue(task, 'ExpiryDate')],
                    [
                      'Target',
                      payloadValue(task, 'TargetReference') ??
                        payloadValue(task, 'TargetLocationId'),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="grid gap-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span>{value ?? 'Not required'}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="size-4" />
                <CardTitle className="text-base">Scan and confirm controls</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      id: task.id,
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
                  onClick={() => mutations.releaseTask.mutate(task.id)}
                >
                  Release task
                </button>
              </div>
              {!canClaim && !canRelease ? (
                <p className="text-muted-foreground text-xs">
                  Available actions depend on task state and claimant.
                </p>
              ) : null}

              {(mutations.claimTask.isPending || mutations.releaseTask.isPending) && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <RefreshCw className="size-4 animate-spin" />
                  Updating task
                </p>
              )}

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ScanLine className="size-4" />
                  Scan evidence
                </div>
                <label className="grid gap-1 text-sm">
                  Scan type
                  <select
                    className="h-9 rounded-md border bg-transparent px-3 text-sm"
                    value={scanType}
                    onChange={(event) => setScanType(event.target.value as MobileScanType)}
                  >
                    {MOBILE_SCAN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Scan value
                  <Input
                    value={scanValue}
                    onChange={(event) => setScanValue(event.target.value)}
                    placeholder="(01)01234567890128"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={manualEntry}
                    onChange={(event) => setManualEntry(event.target.checked)}
                  />
                  Manual entry
                </label>
                {manualEntry ? (
                  <label className="grid gap-1 text-sm">
                    Reason code
                    <Input
                      value={reasonCode}
                      onChange={(event) => setReasonCode(event.target.value)}
                      placeholder="RC-V1-OVERRIDE"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canRecordScan || mutations.recordScan.isPending}
                  onClick={() => {
                    setLatestScan(null);
                    mutations.recordScan.mutate(
                      {
                        id: task.id,
                        input: {
                          scanType,
                          rawValue: scanValue.trim(),
                          manualEntry,
                          reasonCode: manualEntry ? reasonCode.trim() : undefined,
                          deviceCode: deviceCode || undefined,
                          sessionId: task.sessionId || undefined,
                        },
                      },
                      {
                        onSuccess: (scan) => {
                          setLatestScan(scan);
                          setAcceptedScans((current) => {
                            if (scan.result === 'Accepted')
                              return { ...current, [scan.scanType]: scan };
                            const next = { ...current };
                            delete next[scan.scanType];
                            return next;
                          });
                          setScanValue('');
                        },
                        onError: () => {
                          setLatestScan(null);
                        },
                      },
                    );
                  }}
                >
                  Record scan
                </button>
                {mutations.recordScan.isPending ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <RefreshCw className="size-4 animate-spin" />
                    Recording scan
                  </p>
                ) : null}
                {latestScan ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium">
                      {latestScan.result === 'Accepted'
                        ? 'Accepted scan'
                        : latestScan.result === 'Rejected'
                          ? 'Rejected scan'
                          : 'Manual override accepted'}
                    </div>
                    <div className="text-muted-foreground mt-1 space-y-1">
                      {latestScan.normalizedValue ? <div>{latestScan.normalizedValue}</div> : null}
                      {parsedScanText(latestScan) ? <div>{parsedScanText(latestScan)}</div> : null}
                      {latestScan.rejectionMessage ? (
                        <div>{latestScan.rejectionMessage}</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              {task.taskType === 'Pick' ? (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="size-4" />
                    Pick confirmation
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {acceptedScanSummary(acceptedScans)}
                  </div>
                  <label className="grid gap-1 text-sm">
                    Reason code
                    <Input
                      value={confirmReasonCode}
                      onChange={(event) => setConfirmReasonCode(event.target.value)}
                      placeholder={DEFAULT_PICK_CONFIRM_REASON}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Reason note
                    <Input
                      value={confirmReasonNote}
                      onChange={(event) => setConfirmReasonNote(event.target.value)}
                      placeholder="RF pick scan confirmed"
                    />
                  </label>
                  <button
                    type="button"
                    className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canConfirmPick || mutations.confirmPickTask.isPending}
                    onClick={() => {
                      if (!currentPickTaskId) return;
                      setLastConfirmMessage(null);
                      mutations.confirmPickTask.mutate(
                        {
                          mobileTaskId: task.id,
                          input: {
                            mobileTaskId: task.id,
                            reasonCode: confirmReasonCode.trim(),
                            reasonNote: confirmReasonNote.trim() || undefined,
                            deviceCode: deviceCode || undefined,
                            sessionId: task.sessionId || undefined,
                            idempotencyKey: `pick-confirm:${currentPickTaskId}:${task.id}`,
                          },
                        },
                        {
                          onSuccess: (result) => {
                            setLastConfirmMessage(
                              result.isDuplicate
                                ? 'Pick confirmation already posted'
                                : 'Pick confirmation posted',
                            );
                          },
                          onError: () => setLastConfirmMessage(null),
                        },
                      );
                    }}
                  >
                    Confirm pick
                  </button>
                  {!canConfirmPick ? (
                    <p className="text-muted-foreground text-xs">
                      Confirm requires claimed task plus accepted location, item and quantity
                      evidence in this session.
                    </p>
                  ) : null}
                  {mutations.confirmPickTask.isPending ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <RefreshCw className="size-4 animate-spin" />
                      Confirming pick
                    </p>
                  ) : null}
                  {lastConfirmMessage ? (
                    <p className="text-sm font-medium">{lastConfirmMessage}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DetailPageShell>
  );
}
