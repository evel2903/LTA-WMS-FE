import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, LockKeyhole, RotateCcw, Send, UnlockKeyhole } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useCycleCountMutations } from '@modules/CycleCount/Application/Commands/UseCycleCountMutations';
import { useCycleCountWork } from '@modules/CycleCount/Application/Queries/UseCycleCountWorks';
import type { CycleCountWorkStatus } from '@modules/CycleCount/Domain/Types/CycleCountWork';

const CYCLE_COUNT_ACTIONS = new Set(['submit', 'recount', 'adjust', 'unlock']);
const TERMINAL_CYCLE_COUNT_STATUSES: ReadonlySet<CycleCountWorkStatus> = new Set([
  'Accepted',
  'AdjustmentPosted',
  'Unlocked',
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
  return 'Không thể hoàn tất thao tác kiểm kê chu kỳ.';
}

function StatusBadge({ status }: { status: CycleCountWorkStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

export function CycleCountDetailPage({ mode = 'detail' }: { mode?: 'new' | 'detail' }) {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const detailQuery = useCycleCountWork(mode === 'detail' ? id ?? null : null);
  const mutations = useCycleCountMutations();
  const work = detailQuery.data ?? null;
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

  const parsedQuantity = Number(quantity);
  const parsedTolerance = Number(toleranceQuantity);
  const parsedCounted = Number(countedQuantity);
  const hasIdempotencyKey = idempotencyKey.trim().length > 0;
  const canMutateWork = Boolean(work && !TERMINAL_CYCLE_COUNT_STATUSES.has(work.workStatus));
  const canCreate =
    sourceBalanceId.trim().length > 0 &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    hasIdempotencyKey;
  const canSubmit =
    canMutateWork &&
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
                : !work
                  ? 'notFound'
                  : null;

  useEffect(() => {
    if (action && !CYCLE_COUNT_ACTIONS.has(action)) {
      void navigate(ROUTES.CYCLE_COUNT.DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    if (!work) return;
    setSourceBalanceId(work.sourceBalanceId);
    setQuantity(String(work.expectedQuantity));
    setToleranceQuantity(String(work.toleranceQuantity));
    setCountedQuantity(work.countedQuantity === null ? '' : String(work.countedQuantity));
    setApprovalRequestId(work.approvalRequestId ?? '');
  }, [work]);

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
          setIdempotencyKey('');
          void navigate(ROUTES.CYCLE_COUNT.DETAIL(result.cycleCountWork.id));
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!work || !canMutateWork) return;
    mutations.submitWork.mutate(
      {
        id: work.id,
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
    if (!work || !canMutateWork) return;
    mutations.recountWork.mutate(
      { id: work.id, payload: commonPayload },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const handleAdjustment = () => {
    if (!work || !canMutateWork) return;
    mutations.postAdjustment.mutate(
      {
        id: work.id,
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
    if (!work || !canMutateWork) return;
    mutations.unlockWork.mutate(
      { id: work.id, payload: commonPayload },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  return (
    <DetailPageShell
      title={mode === 'new' ? 'Tạo khóa kiểm kê chu kỳ' : work?.countCode ?? 'Công việc kiểm kê chu kỳ'}
      subtitle="Chi tiết kiểm kê chu kỳ và khu vực thao tác có kiểm soát"
      backTo={ROUTES.CYCLE_COUNT.ROOT}
      backLabel="Quay lại kiểm kê chu kỳ"
      status={work ? <StatusBadge status={work.workStatus} /> : null}
      summary={
        work ? (
          <>
            <span>{work.skuCode ?? work.skuId}</span>
            <span>{work.locationCode ?? work.locationId}</span>
            <span>Dự kiến {work.expectedQuantity}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : detailQuery.error
            ? 'Không thể tải chi tiết kiểm kê chu kỳ'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem chi tiết kiểm kê chu kỳ.'
          : detailQuery.error
            ? errorMessage(detailQuery.error) ?? 'Không thể tải chi tiết kiểm kê chu kỳ.'
            : 'Không tìm thấy công việc kiểm kê chu kỳ được yêu cầu.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <form className="space-y-3 rounded-md border p-4" onSubmit={handleCreate}>
              <div className="flex items-center gap-2 font-semibold">
                <LockKeyhole className="size-4" />
                Khóa công việc kiểm kê
              </div>
              <label className="grid gap-1 text-sm">
                ID số dư nguồn
                <Input value={sourceBalanceId} onChange={(event) => setSourceBalanceId(event.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  Số lượng
                  <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Dung sai
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
                Tạo khóa
              </button>
              {createError ? <p className="text-destructive text-sm">{createError}</p> : null}
            </form>
          ) : null}

          {work ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ngữ cảnh công việc</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div>Tồn: {work.sourceBalanceId}</div>
                <div>Khóa: {work.lockedBalanceId ?? 'chưa khóa'}</div>
                <div>Trạng thái gốc: {work.originalInventoryStatusCode}</div>
                <div>Chênh lệch: {work.varianceQuantity ?? 'chưa gửi'}</div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <form className="space-y-3 rounded-md border p-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="size-4" />
            Gửi và kiểm soát
          </div>
          <label className="grid gap-1 text-sm">
            Số lượng kiểm đếm
            <Input
              value={countedQuantity}
              onChange={(event) => setCountedQuantity(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="grid gap-1 text-sm">
            ID yêu cầu phê duyệt
            <Input value={approvalRequestId} onChange={(event) => setApprovalRequestId(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Mã lý do
              <Input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Lý do điều chỉnh
              <Input value={adjustReasonCode} onChange={(event) => setAdjustReasonCode(event.target.value)} />
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
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            disabled={!canSubmit || mutations.submitWork.isPending}
          >
            <ClipboardCheck className="size-4" />
            Gửi kết quả kiểm kê
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              disabled={!canMutateWork || !hasIdempotencyKey || mutations.recountWork.isPending}
              onClick={handleRecount}
            >
              <RotateCcw className="size-3.5" />
              Kiểm đếm lại
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              disabled={!canMutateWork || !hasIdempotencyKey || mutations.postAdjustment.isPending}
              onClick={handleAdjustment}
            >
              <Send className="size-3.5" />
              Điều chỉnh
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              disabled={!canMutateWork || !hasIdempotencyKey || mutations.unlockWork.isPending}
              onClick={handleUnlock}
            >
              <UnlockKeyhole className="size-3.5" />
              Mở khóa
            </button>
          </div>
          {[submitError, recountError, adjustError, unlockError].filter(Boolean).map((message) => (
            <p key={message} className="text-destructive text-sm">
              {message}
            </p>
          ))}
        </form>
      </div>
    </DetailPageShell>
  );
}

export function CycleCountCreatePage() {
  return <CycleCountDetailPage mode="new" />;
}
