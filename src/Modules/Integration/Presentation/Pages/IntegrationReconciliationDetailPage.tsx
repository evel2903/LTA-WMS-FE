import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { GovernanceStateBanner } from '@shared/Components/Page/GovernanceStateBanner';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useIntegrationMutations } from '@modules/Integration/Application/Commands/UseIntegrationMutations';
import {
  useIntegrationReconciliationItems,
  useIntegrationReconciliationRun,
} from '@modules/Integration/Application/Queries/UseIntegrationReconciliation';
import type { ReconciliationItem, ReconciliationRunStatus } from '@modules/Integration/Domain/Types/Integration';

const RECONCILIATION_ACTIONS = new Set(['resolve']);

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
  return 'Không thể hoàn tất thao tác đối soát.';
}

function StatusBadge({ status }: { status: ReconciliationRunStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function ItemRow({ item }: { item: ReconciliationItem }) {
  return (
    <div className="grid gap-3 rounded-md border p-3 text-sm lg:grid-cols-[180px_minmax(0,1fr)_160px]">
      <div className="space-y-1">
        <div className="font-semibold">{vietnameseOperationalLabel(item.mismatchType)}</div>
        <div className="text-muted-foreground text-xs">{vietnameseOperationalLabel(item.severity)}</div>
        <div className="text-muted-foreground text-xs">{vietnameseOperationalLabel(item.itemStatus)}</div>
      </div>
      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <pre className="max-h-40 overflow-auto rounded-md border p-2 text-xs">
          {JSON.stringify(item.expectedSummary ?? {}, null, 2)}
        </pre>
        <pre className="max-h-40 overflow-auto rounded-md border p-2 text-xs">
          {JSON.stringify(item.actualSummary ?? {}, null, 2)}
        </pre>
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <span>Nguồn: {item.sourceType}</span>
        <span className="break-words">ID nguồn: {item.sourceId ?? 'không có'}</span>
        <span className="break-words">Ngoại lệ: {item.exceptionCaseId ?? 'không có'}</span>
        <span className="break-words">Outbox: {item.outboxMessageId ?? 'không có'}</span>
        {item.deadLetterMessageId ? (
          <Link className="underline" to={ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(item.deadLetterMessageId)}>
            Chi tiết dead-letter
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function IntegrationReconciliationDetailPage() {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const runQuery = useIntegrationReconciliationRun(id ?? null);
  const itemsQuery = useIntegrationReconciliationItems(id ?? null, { pageSize: 100 });
  const openItemsQuery = useIntegrationReconciliationItems(id ?? null, { pageSize: 100, itemStatus: 'Open' });
  const mutations = useIntegrationMutations();
  const run = runQuery.data ?? null;
  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data?.items]);
  const openItems = useMemo(() => openItemsQuery.data?.items ?? [], [openItemsQuery.data?.items]);
  const openItemCount = openItemsQuery.data?.totalItems ?? openItems.length;
  const selectedAction = action && RECONCILIATION_ACTIONS.has(action) ? action : null;
  const [itemId, setItemId] = useState('');
  const [reasonCode, setReasonCode] = useState('RC-V1-DEAD-LETTER-FIX');
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [approvalRequestId, setApprovalRequestId] = useState('');
  const [impactsInventory, setImpactsInventory] = useState(false);
  const [impactsFinance, setImpactsFinance] = useState(false);

  useEffect(() => {
    if (action && !RECONCILIATION_ACTIONS.has(action)) {
      void navigate(ROUTES.INTEGRATION.RECONCILIATION_DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    if (openItems.length === 0) {
      if (itemId) setItemId('');
      return;
    }
    if (!openItems.some((item) => item.id === itemId)) setItemId(openItems[0].id);
  }, [itemId, openItems]);

  const actionEvidence = evidence(evidenceRefs);
  const needsApproval = impactsInventory || impactsFinance;
  const approvalBlocked = needsApproval && approvalRequestId.trim().length === 0;
  const canResolve =
    selectedAction === 'resolve' &&
    itemId.trim().length > 0 &&
    reasonCode.trim().length > 0 &&
    actionEvidence.length > 0 &&
    idempotencyKey.trim().length > 0 &&
    resolutionNote.trim().length > 0 &&
    !approvalBlocked;
  const mutationError = errorMessage(mutations.resolveReconciliationItem.error);
  const apiError =
    runQuery.error instanceof ApiError
      ? runQuery.error
      : itemsQuery.error instanceof ApiError
        ? itemsQuery.error
        : openItemsQuery.error instanceof ApiError
          ? openItemsQuery.error
          : null;
  const state = !id
    ? 'notFound'
    : apiError?.isForbidden
      ? 'forbidden'
      : apiError?.status === 404
        ? 'notFound'
        : runQuery.isLoading || itemsQuery.isLoading || openItemsQuery.isLoading
          ? 'loading'
          : runQuery.error || itemsQuery.error || openItemsQuery.error
            ? 'error'
            : !run
              ? 'notFound'
              : openItemCount === 0
                ? 'readOnly'
                : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canResolve) return;
    mutations.resolveReconciliationItem.mutate(
      {
        id: itemId,
        payload: {
          reasonCode: reasonCode.trim(),
          reasonNote: reasonNote.trim() || undefined,
          evidenceRefs: actionEvidence,
          idempotencyKey: idempotencyKey.trim(),
          resolutionNote: resolutionNote.trim(),
          approvalRequestId: approvalRequestId.trim() || undefined,
          impactsInventory,
          impactsFinance,
        },
      },
      {
        onSuccess: () => {
          setItemId('');
          setIdempotencyKey('');
          setResolutionNote('');
          void navigate(ROUTES.INTEGRATION.RECONCILIATION_DETAIL(id ?? ''), { replace: true });
        },
      },
    );
  };

  return (
    <DetailPageShell
      title={run?.businessReference ?? 'Đối soát tích hợp'}
      subtitle={run ? `${run.warehouseId}${run.ownerId ? ` / ${run.ownerId}` : ' / chưa có chủ hàng'}` : undefined}
      backTo={ROUTES.INTEGRATION.RECONCILIATION}
      backLabel="Quay lại đối soát"
      status={run ? <StatusBadge status={run.runStatus} /> : null}
      summary={
        run ? (
          <>
            <span>Dòng hàng {run.itemCount}</span>
            <span>Sai lệch {run.mismatchCount}</span>
            <span>Ngoại lệ {run.exceptionCount}</span>
          </>
        ) : null
      }
      actions={
        run ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.INTEGRATION.RECONCILIATION_ACTION(run.id, 'resolve')}>
              <CheckCircle2 className="size-4" />
              Xử lý dòng
            </Link>
          </Button>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : runQuery.error || itemsQuery.error
            ? 'Không thể tải đối soát'
            : state === 'readOnly'
              ? 'Đối soát chỉ đọc'
              : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem chi tiết đối soát.'
          : runQuery.error || itemsQuery.error
            ? errorMessage(runQuery.error ?? itemsQuery.error) ?? 'Không thể tải không gian làm việc đối soát.'
            : state === 'readOnly'
              ? 'Không có dòng đối soát mở để thao tác.'
              : 'Không tìm thấy lần đối soát được yêu cầu.'
      }
    >
      {run ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <GovernanceStateBanner
              state={openItems.length > 0 ? 'warning' : 'readOnly'}
              title={openItems.length > 0 ? 'Xử lý thủ công yêu cầu bằng chứng audit' : 'Không có dòng mở'}
              message={
                openItems.length > 0
                  ? 'Xử lý chỉ cập nhật trạng thái đối soát. Ảnh hưởng tồn kho hoặc tài chính cần phê duyệt.'
                  : 'Lần chạy này vẫn khả dụng để xem lại ở chế độ chỉ đọc.'
              }
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Số lượng nguồn</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-3">
                {Object.entries(run.sourceCounts).map(([key, value]) => (
                  <div key={key} className="rounded-md border p-2">
                    <div className="text-muted-foreground text-xs">{key}</div>
                    <div className="font-semibold">{value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-3">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            {selectedAction === 'resolve' ? (
              <form onSubmit={handleSubmit}>
                <ActionPanel
                  title="Xử lý thủ công"
                  description="Xử lý một dòng đối soát với lý do, bằng chứng và idempotency."
                  state={
                    mutations.resolveReconciliationItem.isPending
                      ? 'pending'
                      : mutationError
                        ? 'error'
                        : openItems.length === 0
                          ? 'disabled'
                          : 'idle'
                  }
                  stateMessage={mutationError ?? undefined}
                  governanceState={approvalBlocked ? 'blocked' : needsApproval ? 'approvalRequired' : 'warning'}
                  governanceMessage={
                    approvalBlocked
                      ? 'Ảnh hưởng tồn kho hoặc tài chính cần ApprovalRequestId trước khi gửi.'
                      : needsApproval
                        ? 'Tham chiếu phê duyệt sẽ được ghi vào audit trước khi đổi trạng thái.'
                        : 'Thao tác này chỉ ghi trạng thái xử lý đối soát và audit.'
                  }
                  footer={
                    <Button type="submit" disabled={!canResolve || mutations.resolveReconciliationItem.isPending}>
                      Xử lý dòng
                    </Button>
                  }
                >
                  <label className="grid gap-1 text-sm">
                    Hàng hóa
                    <select
                      className="h-9 rounded-md border bg-transparent px-3 text-sm"
                      value={itemId}
                      onChange={(event) => setItemId(event.target.value)}
                    >
                      {openItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.mismatchType} / {item.severity}
                        </option>
                      ))}
                    </select>
                  </label>
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
                  <label className="grid gap-1 text-sm">
                    Ghi chú xử lý
                    <textarea
                      className="min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                    />
                  </label>
                  <div className="grid gap-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={impactsInventory}
                        onChange={(event) => setImpactsInventory(event.target.checked)}
                      />
                      Ảnh hưởng tồn kho
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={impactsFinance}
                        onChange={(event) => setImpactsFinance(event.target.checked)}
                      />
                      Ảnh hưởng tài chính
                    </label>
                  </div>
                  {needsApproval ? (
                    <label className="grid gap-1 text-sm">
                      Yêu cầu phê duyệt
                      <Input
                        value={approvalRequestId}
                        onChange={(event) => setApprovalRequestId(event.target.value)}
                      />
                    </label>
                  ) : null}
                </ActionPanel>
              </form>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit xử lý</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div>Mã lý do: {run.reasonCode}</div>
                  <div>Ghi chú lý do: {run.reasonNote ?? 'chưa ghi nhận'}</div>
                  <div>Xử lý lúc: {run.resolvedAt ?? 'chưa xử lý'}</div>
                  <div>Xử lý bởi: {run.resolvedBy ?? 'chưa xử lý'}</div>
                  <div className="break-words">
                    Tham chiếu bằng chứng: {run.evidenceRefs.length ? run.evidenceRefs.join(', ') : 'chưa ghi nhận'}
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      ) : null}
    </DetailPageShell>
  );
}
