import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, PackagePlus, Send, XCircle } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useReplenishmentMutations } from '@modules/Replenishment/Application/Commands/UseReplenishmentMutations';
import { useReplenishmentTask } from '@modules/Replenishment/Application/Queries/UseReplenishmentTasks';
import {
  INVENTORY_RECONCILIATION_RETRY_STATUSES,
  REPLENISHMENT_TRIGGER_TYPES,
} from '@modules/Replenishment/Domain/Constants/ReplenishmentConstants';
import type {
  InventoryReconciliationRetryStatus,
  ReplenishmentTaskStatus,
  ReplenishmentTriggerType,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';

const REPLENISHMENT_ACTIONS = new Set(['confirm', 'cancel', 'failure']);
const TERMINAL_REPLENISHMENT_STATUSES: ReadonlySet<ReplenishmentTaskStatus> = new Set([
  'Confirmed',
  'Cancelled',
]);

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
  return 'Không thể hoàn tất thao tác bổ sung hàng.';
}

function StatusBadge({ status }: { status: ReplenishmentTaskStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

export function ReplenishmentDetailPage({ mode = 'detail' }: { mode?: 'new' | 'detail' }) {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const detailQuery = useReplenishmentTask(mode === 'detail' ? id ?? null : null);
  const mutations = useReplenishmentMutations();
  const task = detailQuery.data ?? null;
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

  const parsedQuantity = Number(quantity);
  const hasIdempotencyKey = idempotencyKey.trim().length > 0;
  const releaseEvidence = evidence(evidenceRefs);
  const canMutateTask = Boolean(task && !TERMINAL_REPLENISHMENT_STATUSES.has(task.taskStatus));
  const canRelease =
    sourceBalanceId.trim().length > 0 &&
    targetLocationId.trim().length > 0 &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    releaseReasonCode.trim().length > 0 &&
    hasIdempotencyKey;
  const canMutateSelected = canMutateTask && movementReasonCode.trim().length > 0 && hasIdempotencyKey;
  const canCancelSelected = canMutateTask && cancelReasonCode.trim().length > 0 && hasIdempotencyKey;
  const canRecordFailure =
    businessReference.trim().length > 0 &&
    reconciliationEventType.trim().length > 0 &&
    (task?.warehouseId ?? '').trim().length > 0 &&
    errorText.trim().length > 0 &&
    releaseEvidence.length > 0 &&
    hasIdempotencyKey;
  const releaseError = errorMessage(mutations.releaseTask.error);
  const confirmError = errorMessage(mutations.confirmTask.error);
  const cancelError = errorMessage(mutations.cancelTask.error);
  const failureError = errorMessage(mutations.recordReconciliationFailure.error);
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const state =
    mode === 'new'
      ? null
      : !id
        ? 'notFound'
        : apiError?.isForbidden
          ? 'forbidden'
          : apiError?.status === 404
            ? 'notFound'
          : detailQuery.isLoading
            ? 'loading'
            : detailQuery.error
              ? 'error'
              : !task
                ? 'notFound'
                : null;

  useEffect(() => {
    if (action && !REPLENISHMENT_ACTIONS.has(action)) {
      void navigate(ROUTES.REPLENISHMENT.DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    if (!task) return;
    setTriggerType(task.triggerType);
    setSourceBalanceId(task.sourceBalanceId);
    setTargetLocationId(task.targetLocationId);
    setQuantity(String(task.quantity));
    setShortPickReference(task.shortPickReference ?? '');
    setBusinessReference(task.taskCode);
  }, [task]);

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
          setIdempotencyKey('');
          void navigate(ROUTES.REPLENISHMENT.DETAIL(result.replenishmentTask.id));
        },
      },
    );
  };

  const handleConfirm = () => {
    if (!task || !canMutateTask) return;
    mutations.confirmTask.mutate(
      {
        id: task.id,
        payload: { reasonCode: movementReasonCode.trim(), ...commonReason },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleCancel = () => {
    if (!task || !canMutateTask) return;
    mutations.cancelTask.mutate(
      {
        id: task.id,
        payload: { reasonCode: cancelReasonCode.trim(), ...commonReason },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleRecordFailure = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task) return;
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
        warehouseId: task.warehouseId,
        ownerId: task.ownerId || undefined,
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
    <DetailPageShell
      title={mode === 'new' ? 'Phát hành tác vụ bổ sung hàng' : task?.taskCode ?? 'Tác vụ bổ sung hàng'}
      subtitle="Chi tiết bổ sung hàng và khu vực thao tác có kiểm soát"
      backTo={ROUTES.REPLENISHMENT.ROOT}
      backLabel="Quay lại bổ sung hàng"
      status={task ? <StatusBadge status={task.taskStatus} /> : null}
      summary={
        task ? (
          <>
            <span>{task.skuCode ?? task.skuId}</span>
            <span>{task.sourceInventoryStatusCode}</span>
            <span>{task.targetLocationCode ?? task.targetLocationId}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : detailQuery.error
            ? 'Không thể tải chi tiết bổ sung hàng'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem chi tiết bổ sung hàng.'
          : detailQuery.error
            ? errorMessage(detailQuery.error) ?? 'Không thể tải chi tiết bổ sung hàng.'
            : 'Không tìm thấy tác vụ bổ sung hàng được yêu cầu.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <form className="space-y-3 rounded-md border p-4" onSubmit={handleRelease}>
              <div className="flex items-center gap-2 font-semibold">
                <PackagePlus className="size-4" />
                Phát hành bổ sung hàng
              </div>
              <label className="grid gap-1 text-sm">
                Loại kích hoạt
                <select
                  className="h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={triggerType}
                  onChange={(event) => setTriggerType(event.target.value as ReplenishmentTriggerType)}
                >
                  {REPLENISHMENT_TRIGGER_TYPES.map((trigger) => (
                    <option key={trigger} value={trigger}>
                      {vietnameseOperationalLabel(trigger)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                ID số dư nguồn
                <Input value={sourceBalanceId} onChange={(event) => setSourceBalanceId(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                ID vị trí đích
                <Input value={targetLocationId} onChange={(event) => setTargetLocationId(event.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  Số lượng
                  <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Tham chiếu lấy thiếu
                  <Input value={shortPickReference} onChange={(event) => setShortPickReference(event.target.value)} />
                </label>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                disabled={!canRelease || mutations.releaseTask.isPending}
              >
                <Send className="size-4" />
                Phát hành tác vụ
              </button>
              {releaseError ? <p className="text-destructive text-sm">{releaseError}</p> : null}
            </form>
          ) : null}

          {task ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ngữ cảnh tác vụ</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div>Nguồn: {task.sourceBalanceId}</div>
                <div>Đích: {task.targetLocationCode ?? task.targetLocationId}</div>
                <div>Outbox: {task.outboxMessageId ?? 'chưa phát'}</div>
                <div>Giao dịch xác nhận: {task.confirmTransactionId ?? 'chưa xác nhận'}</div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-md border p-4">
            <div className="font-semibold">Vòng đời tác vụ</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                disabled={!canMutateSelected || mutations.confirmTask.isPending}
                onClick={handleConfirm}
              >
                <CheckCircle2 className="size-4" />
                Xác nhận
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                disabled={!canCancelSelected || mutations.cancelTask.isPending}
                onClick={handleCancel}
              >
                <XCircle className="size-4" />
                Hủy
              </button>
            </div>
            {(confirmError || cancelError) ? (
              <p className="text-destructive text-sm">{confirmError ?? cancelError}</p>
            ) : null}
          </div>

          <form className="space-y-3 rounded-md border p-4" onSubmit={handleRecordFailure}>
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              Lỗi đối soát
            </div>
            <label className="grid gap-1 text-sm">
              Tham chiếu nghiệp vụ
              <Input value={businessReference} onChange={(event) => setBusinessReference(event.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                Loại sự kiện
                <Input
                  value={reconciliationEventType}
                  onChange={(event) => setReconciliationEventType(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Trạng thái retry
                <select
                  className="h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={retryStatus}
                  onChange={(event) => setRetryStatus(event.target.value as InventoryReconciliationRetryStatus)}
                >
                  {INVENTORY_RECONCILIATION_RETRY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {vietnameseOperationalLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Thông báo lỗi
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
            {payloadError ? <p className="text-destructive text-sm">{payloadError}</p> : null}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              disabled={!canRecordFailure || mutations.recordReconciliationFailure.isPending}
            >
              <Send className="size-4" />
              Ghi nhận lỗi
            </button>
            {failureError ? <p className="text-destructive text-sm">{failureError}</p> : null}
          </form>

          <div className="space-y-3 rounded-md border p-4">
            <div className="font-semibold">Lý do và bằng chứng</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                Lý do phát hành
                <Input value={releaseReasonCode} onChange={(event) => setReleaseReasonCode(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                Lý do dịch chuyển
                <Input value={movementReasonCode} onChange={(event) => setMovementReasonCode(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                Lý do hủy
                <Input value={cancelReasonCode} onChange={(event) => setCancelReasonCode(event.target.value)} />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Ghi chú lý do
              <Input value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Tham chiếu bằng chứng
              <textarea
                className="min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm"
                value={evidenceRefs}
                onChange={(event) => setEvidenceRefs(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Khóa idempotency
              <Input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
            </label>
          </div>
        </aside>
      </div>
    </DetailPageShell>
  );
}

export function ReplenishmentCreatePage() {
  return <ReplenishmentDetailPage mode="new" />;
}
