import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, RotateCcw, ShieldAlert, Wrench, XCircle } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useIntegrationMutations } from '@modules/Integration/Application/Commands/UseIntegrationMutations';
import { useIntegrationDeadLetter } from '@modules/Integration/Application/Queries/UseIntegrationDeadLetters';
import { DEAD_LETTER_ACTIONABLE_STATUSES } from '@modules/Integration/Domain/Constants/IntegrationConstants';
import type { DeadLetterActionInput } from '@modules/Integration/Domain/Types/IntegrationQuery';
import type { OutboxMessageStatus } from '@modules/Integration/Domain/Types/Integration';

const INTEGRATION_ACTIONS = new Set(['retry', 'manual-fix', 'ack', 'ignore']);
const ACTIONABLE_STATUS = DEAD_LETTER_ACTIONABLE_STATUSES[0] satisfies OutboxMessageStatus;

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
  return 'Không thể hoàn tất thao tác tích hợp.';
}

function StatusBadge({ status }: { status: OutboxMessageStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

export function IntegrationDeadLetterDetailPage() {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const detailQuery = useIntegrationDeadLetter(id ?? null);
  const mutations = useIntegrationMutations();
  const message = detailQuery.data ?? null;
  const [reasonCode, setReasonCode] = useState('RC-V1-DEAD-LETTER-FIX');
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [manualPayloadText, setManualPayloadText] = useState('');
  const [payloadError, setPayloadError] = useState('');

  const selectedAction = action && INTEGRATION_ACTIONS.has(action) ? action : null;
  const actionEvidence = evidence(evidenceRefs);
  const isActionable = message?.status === ACTIONABLE_STATUS;
  const canAct =
    Boolean(message) &&
    isActionable &&
    reasonCode.trim().length > 0 &&
    actionEvidence.length > 0 &&
    idempotencyKey.trim().length > 0;
  const mutationError =
    errorMessage(mutations.retryDeadLetter.error) ??
    errorMessage(mutations.manualFixDeadLetter.error) ??
    errorMessage(mutations.acknowledgeDeadLetter.error) ??
    errorMessage(mutations.ignoreDeadLetter.error);
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const state = !id
    ? 'notFound'
    : apiError?.isForbidden
      ? 'forbidden'
      : apiError?.status === 404
        ? 'notFound'
        : detailQuery.isLoading
          ? 'loading'
          : detailQuery.error
            ? 'error'
            : !message
              ? 'notFound'
              : !isActionable
                ? 'readOnly'
                : null;

  useEffect(() => {
    if (action && !INTEGRATION_ACTIONS.has(action)) {
      void navigate(ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  const buildPayload = (): DeadLetterActionInput | null => {
    let manualFixPayload: Record<string, unknown> | null = null;
    if (selectedAction === 'manual-fix' && manualPayloadText.trim()) {
      try {
        manualFixPayload = JSON.parse(manualPayloadText) as Record<string, unknown>;
        setPayloadError('');
      } catch {
        setPayloadError('Payload sửa thủ công phải là JSON hợp lệ.');
        return null;
      }
    }
    return {
      reasonCode: reasonCode.trim(),
      reasonNote: reasonNote.trim() || undefined,
      evidenceRefs: actionEvidence,
      idempotencyKey: idempotencyKey.trim(),
      manualFixPayload,
    };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !selectedAction) return;
    const payload = buildPayload();
    if (!payload) return;
    const input = { id, payload };
    const onSuccess = () => {
      setIdempotencyKey('');
      void navigate(ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(id), { replace: true });
    };
    if (selectedAction === 'retry') mutations.retryDeadLetter.mutate(input, { onSuccess });
    if (selectedAction === 'manual-fix') mutations.manualFixDeadLetter.mutate(input, { onSuccess });
    if (selectedAction === 'ack') mutations.acknowledgeDeadLetter.mutate(input, { onSuccess });
    if (selectedAction === 'ignore') mutations.ignoreDeadLetter.mutate(input, { onSuccess });
  };

  return (
    <DetailPageShell
      title={message?.businessReference ?? 'Dead-letter tích hợp'}
      subtitle={message?.messageId ?? 'Chi tiết dead-letter và khu vực thao tác có kiểm soát'}
      backTo={ROUTES.INTEGRATION.ROOT}
      backLabel="Quay lại tích hợp"
      status={message ? <StatusBadge status={message.status} /> : null}
      summary={
        message ? (
          <>
            <span>{message.eventType}</span>
            <span>{message.warehouseContext}</span>
            {message.ownerContext ? <span>{message.ownerContext}</span> : null}
          </>
        ) : null
      }
      actions={
        message ? (
          <>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTES.INTEGRATION.DEAD_LETTER_ACTION(message.id, 'retry')}>
                <RotateCcw className="size-4" />
                Thử lại
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTES.INTEGRATION.DEAD_LETTER_ACTION(message.id, 'manual-fix')}>
                <Wrench className="size-4" />
                Sửa thủ công
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTES.INTEGRATION.DEAD_LETTER_ACTION(message.id, 'ack')}>
                <CheckCircle2 className="size-4" />
                Xác nhận
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTES.INTEGRATION.DEAD_LETTER_ACTION(message.id, 'ignore')}>
                <XCircle className="size-4" />
                Bỏ qua
              </Link>
            </Button>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : detailQuery.error
            ? 'Không thể tải dead-letter'
            : state === 'readOnly'
              ? 'Dead-letter chỉ đọc'
              : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem chi tiết thư chết tích hợp.'
          : detailQuery.error
            ? errorMessage(detailQuery.error) ?? 'Không thể tải chi tiết thư chết tích hợp.'
            : state === 'readOnly'
              ? 'Thao tác bị tắt vì thông điệp tích hợp này không còn ở trạng thái DeadLetter.'
              : 'Không tìm thấy dead-letter tích hợp được yêu cầu.'
      }
    >
      {message ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ngữ cảnh thông điệp</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div>Loại sự kiện: {message.eventType}</div>
                <div>Nguồn: {message.sourceSystem}</div>
                <div>Đích: {message.targetSystem}</div>
                <div>Lần thử: {message.attemptCount}/{message.maxAttempts}</div>
                <div>Lỗi: {message.failureCategory ?? 'chưa phân loại'}</div>
                <div className="break-words">Lỗi cuối: {message.lastError ?? message.deadLetterReason ?? 'không có'}</div>
                <div>Lần thử kế tiếp: {message.nextRetryAt ?? 'chưa lên lịch'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-md border p-3 text-xs">
                  {JSON.stringify(message.payload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            {isActionable ? (
              <form className="space-y-3 rounded-md border p-4" onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="size-4" />
                  {selectedAction ?? 'Chọn thao tác'}
                </div>
                <label className="grid gap-1 text-sm">
                  Mã lý do
                  <Input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
                </label>
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
                {selectedAction === 'manual-fix' ? (
                  <label className="grid gap-1 text-sm">
                    Payload JSON sửa thủ công
                    <textarea
                      className="min-h-24 rounded-md border bg-transparent px-3 py-2 text-sm"
                      value={manualPayloadText}
                      onChange={(event) => {
                        setManualPayloadText(event.target.value);
                        setPayloadError('');
                      }}
                    />
                  </label>
                ) : null}
                {payloadError ? <p className="text-destructive text-sm">{payloadError}</p> : null}
                {mutationError ? <p className="text-destructive text-sm">{mutationError}</p> : null}
                <Button type="submit" className="w-full" disabled={!selectedAction || !canAct}>
                  Áp dụng thao tác
                </Button>
              </form>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audit xử lý</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div>Thao tác xử lý: {message.resolutionAction ?? 'chưa xử lý'}</div>
                <div>Xử lý lúc: {message.resolvedAt ?? 'chưa xử lý'}</div>
                <div>Xử lý bởi: {message.resolvedBy ?? 'chưa xử lý'}</div>
                <div>Mã lý do: {message.reasonCode ?? 'chưa ghi nhận'}</div>
                <div>Ghi chú lý do: {message.reasonNote ?? 'chưa ghi nhận'}</div>
                <div className="break-words">
                  Tham chiếu bằng chứng: {message.evidenceRefs.length ? message.evidenceRefs.join(', ') : 'chưa ghi nhận'}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : null}
    </DetailPageShell>
  );
}
