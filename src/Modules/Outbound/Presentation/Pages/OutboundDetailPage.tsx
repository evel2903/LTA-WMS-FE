import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileInput, PackageCheck, PauseCircle, ShieldX, XCircle } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useOutboundMutations } from '@modules/Outbound/Application/Commands/UseOutboundMutations';
import {
  useOutboundAllocations,
  useOutboundOrder,
  useOutboundPickReleases,
} from '@modules/Outbound/Application/Queries/UseOutboundOrders';
import type {
  AllocationPolicy,
  AllocationStatus,
  OutboundOrderStatus,
  PickReleaseMode,
  PickReleaseStatus,
} from '@modules/Outbound/Domain/Types/OutboundOrder';

const ACTIONS = new Set(['hold', 'reject', 'cancel', 'validate', 'allocate', 'release']);

function evidence(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể hoàn tất thao tác xuất kho.';
}

function StatusBadge({ status }: { status: OutboundOrderStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function AllocationBadge({ status }: { status: AllocationStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function PickReleaseBadge({ status }: { status: PickReleaseStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

export function OutboundDetailPage({ mode = 'detail' }: { mode?: 'new' | 'detail' }) {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const orderQuery = useOutboundOrder(mode === 'detail' ? (id ?? null) : null);
  const mutations = useOutboundMutations();
  const order = orderQuery.data ?? null;
  const allocationsQuery = useOutboundAllocations(order?.id ?? null);
  const releasesQuery = useOutboundPickReleases(order?.id ?? null);
  const [sourceSystem, setSourceSystem] = useState('OMS');
  const [sourceReference, setSourceReference] = useState('');
  const [customerExternalReference, setCustomerExternalReference] = useState('');
  const [shipToReference, setShipToReference] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [uomId, setUomId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reasonCode, setReasonCode] = useState('RC-V1-DISCREPANCY');
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [allocationPolicy, setAllocationPolicy] = useState<AllocationPolicy>('PartialBackorder');
  const [releaseMode, setReleaseMode] = useState<PickReleaseMode>('Discrete');
  const [batchSize, setBatchSize] = useState('50');

  useEffect(() => {
    if (action && !ACTIONS.has(action)) {
      void navigate(ROUTES.OUTBOUND.DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    if (!order) return;
    setSourceSystem(order.sourceSystem);
    setSourceReference(order.sourceReference);
    setOwnerId(order.ownerId);
    setWarehouseId(order.warehouseId);
    setCustomerExternalReference(order.customerExternalReference ?? order.customerCode ?? '');
    setShipToReference(order.shipToReference ?? '');
  }, [order]);

  const apiError = orderQuery.error instanceof ApiError ? orderQuery.error : null;
  const state =
    mode === 'new'
      ? null
      : !id
        ? 'notFound'
        : apiError?.isForbidden
          ? 'forbidden'
          : apiError?.status === 404
            ? 'notFound'
            : orderQuery.isLoading
              ? 'loading'
              : orderQuery.error
                ? 'error'
                : !order
                  ? 'notFound'
                  : null;
  const actionPayload = useMemo(
    () => ({
      reasonCode: reasonCode.trim(),
      reasonNote: reasonNote.trim() || undefined,
      evidenceRefs: evidence(evidenceRefs),
      idempotencyKey: idempotencyKey.trim(),
    }),
    [evidenceRefs, idempotencyKey, reasonCode, reasonNote],
  );
  const canReasonAction = Boolean(
    order && actionPayload.reasonCode && actionPayload.idempotencyKey,
  );
  const allocationPayload = useMemo(
    () => ({
      policy: allocationPolicy,
      reasonCode: reasonCode.trim() || undefined,
      reasonNote: reasonNote.trim() || undefined,
      evidenceRefs: evidence(evidenceRefs),
      idempotencyKey: idempotencyKey.trim(),
    }),
    [allocationPolicy, evidenceRefs, idempotencyKey, reasonCode, reasonNote],
  );
  const canAllocate = Boolean(
    order && order.documentStatus === 'Validated' && allocationPayload.idempotencyKey,
  );
  const hasReleasableAllocation = Boolean(
    allocationsQuery.data?.items.some(
      (allocation) =>
        (allocation.status === 'Allocated' || allocation.status === 'PartiallyAllocated') &&
        allocation.totalAllocatedQuantity > 0,
    ),
  );
  const hasActiveRelease = Boolean(
    releasesQuery.data?.items.some(
      (release) => release.status === 'Released' || release.status === 'Blocked',
    ),
  );
  const releasePayload = useMemo(
    () => ({
      releaseMode,
      batchSize: Number(batchSize),
      reasonCode: reasonCode.trim() || undefined,
      reasonNote: reasonNote.trim() || undefined,
      evidenceRefs: evidence(evidenceRefs),
      idempotencyKey: idempotencyKey.trim(),
    }),
    [batchSize, evidenceRefs, idempotencyKey, reasonCode, reasonNote, releaseMode],
  );
  const canRelease = Boolean(
    order &&
    order.documentStatus === 'Validated' &&
    hasReleasableAllocation &&
    !hasActiveRelease &&
    releasePayload.idempotencyKey &&
    Number.isInteger(releasePayload.batchSize) &&
    releasePayload.batchSize >= 1 &&
    releasePayload.batchSize <= 100 &&
    !mutations.releaseOrder.isPending,
  );
  const mutationError =
    errorMessage(mutations.importOrder.error) ??
    errorMessage(mutations.validateOrder.error) ??
    errorMessage(mutations.holdOrder.error) ??
    errorMessage(mutations.rejectOrder.error) ??
    errorMessage(mutations.cancelOrder.error) ??
    errorMessage(mutations.allocateOrder.error) ??
    errorMessage(mutations.releaseOrder.error);

  const handleImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutations.importOrder.mutate(
      {
        sourceSystem: sourceSystem.trim(),
        sourceReference: sourceReference.trim(),
        customerSourceSystem: sourceSystem.trim(),
        customerExternalReference: customerExternalReference.trim(),
        shipToReference: shipToReference.trim() || undefined,
        ownerId: ownerId.trim(),
        warehouseId: warehouseId.trim(),
        reasonCode: reasonCode.trim() || undefined,
        reasonNote: reasonNote.trim() || undefined,
        evidenceRefs: evidence(evidenceRefs),
        idempotencyKey: idempotencyKey.trim(),
        lines: [
          {
            lineNumber: 1,
            skuId: skuId.trim(),
            uomId: uomId.trim(),
            orderedQuantity: Number(quantity),
            externalLineReference: '1',
          },
        ],
      },
      {
        onSuccess: (created) => {
          setIdempotencyKey('');
          void navigate(ROUTES.OUTBOUND.DETAIL(created.id));
        },
      },
    );
  };

  const runReasonAction = (name: 'hold' | 'reject' | 'cancel') => {
    if (!order) return;
    const input = { id: order.id, payload: actionPayload };
    if (name === 'hold')
      mutations.holdOrder.mutate(input, { onSuccess: () => setIdempotencyKey('') });
    if (name === 'reject')
      mutations.rejectOrder.mutate(input, { onSuccess: () => setIdempotencyKey('') });
    if (name === 'cancel')
      mutations.cancelOrder.mutate(input, { onSuccess: () => setIdempotencyKey('') });
  };

  const runAllocate = () => {
    if (!order) return;
    mutations.allocateOrder.mutate(
      { id: order.id, payload: allocationPayload },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const runRelease = () => {
    if (!order) return;
    mutations.releaseOrder.mutate(
      { id: order.id, payload: releasePayload },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  return (
    <DetailPageShell
      title={mode === 'new' ? 'Import đơn xuất kho' : (order?.orderNumber ?? 'Đơn xuất kho')}
      subtitle="Import đơn xuất, xác thực và thao tác chứng từ có kiểm soát"
      backTo={ROUTES.OUTBOUND.ROOT}
      backLabel="Quay lại đơn xuất kho"
      status={order ? <StatusBadge status={order.documentStatus} /> : null}
      summary={
        order ? (
          <>
            <span>{order.businessReference}</span>
            <span>{order.customerCode ?? order.customerId ?? 'chưa xác định khách hàng'}</span>
            <span>{order.warehouseCode ?? order.warehouseId}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : orderQuery.error
            ? 'Không thể tải đơn xuất kho'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem chi tiết đơn xuất kho.'
          : orderQuery.error
            ? (errorMessage(orderQuery.error) ?? 'Không thể tải chi tiết đơn xuất kho.')
            : 'Không tìm thấy đơn xuất kho được yêu cầu.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <ActionPanel
              title="Nhập đơn xuất kho"
              description="Tạo nhu cầu xuất kho đã xác thực hoặc đang giữ từ dữ liệu nguồn."
            >
              <form className="space-y-3" onSubmit={handleImport}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Hệ thống nguồn
                    <Input
                      value={sourceSystem}
                      onChange={(event) => setSourceSystem(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Tham chiếu nguồn
                    <Input
                      value={sourceReference}
                      onChange={(event) => setSourceReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Tham chiếu khách hàng
                    <Input
                      value={customerExternalReference}
                      onChange={(event) => setCustomerExternalReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Tham chiếu giao đến
                    <Input
                      value={shipToReference}
                      onChange={(event) => setShipToReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID chủ hàng
                    <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID kho
                    <Input
                      value={warehouseId}
                      onChange={(event) => setWarehouseId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID SKU
                    <Input value={skuId} onChange={(event) => setSkuId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID đơn vị tính
                    <Input value={uomId} onChange={(event) => setUomId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Số lượng
                    <Input
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={!sourceReference || !ownerId || !warehouseId || !idempotencyKey}
                >
                  <FileInput className="size-4" aria-hidden="true" />
                  Nhập đơn xuất kho
                </Button>
              </form>
            </ActionPanel>
          ) : null}

          {order ? (
            <div className="space-y-3 rounded-md border p-4 text-sm">
              <h2 className="text-base font-semibold">Dòng đơn hàng</h2>
              {order.lines.map((line) => (
                <div key={line.id} className="rounded-md border p-3">
                  <div className="font-medium">
                    {line.lineNumber}. {line.skuCode ?? line.skuId}
                  </div>
                  <div className="text-muted-foreground">
                    {line.orderedQuantity} {line.uomCode ?? line.uomId}
                  </div>
                  {line.validationErrors.length ? (
                    <ul className="text-destructive mt-2 list-disc pl-5">
                      {line.validationErrors.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
              {order.validationErrors.length ? (
                <div className="text-destructive rounded-md border p-3">
                  <div className="font-medium">Lỗi xác thực</div>
                  <ul className="mt-2 list-disc pl-5">
                    {order.validationErrors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {order ? (
            <div className="space-y-3 rounded-md border p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Phân bổ</h2>
                <span className="text-muted-foreground text-xs">
                  {allocationsQuery.data?.totalItems ?? 0} bản ghi
                </span>
              </div>
              {allocationsQuery.isLoading ? (
                <div className="text-muted-foreground">Đang tải phân bổ...</div>
              ) : allocationsQuery.data?.items.length ? (
                allocationsQuery.data.items.map((allocation) => (
                  <div key={allocation.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{allocation.allocationNumber}</div>
                      <AllocationBadge status={allocation.status} />
                    </div>
                    <div className="text-muted-foreground grid gap-1 sm:grid-cols-3">
                      <span>Chính sách: {allocation.policy}</span>
                      <span>Đã phân bổ: {allocation.totalAllocatedQuantity}</span>
                      <span>Đặt sau: {allocation.totalBackorderedQuantity}</span>
                    </div>
                    {allocation.shortageReason ? (
                      <div className="text-destructive">{allocation.shortageReason}</div>
                    ) : null}
                    <div className="space-y-1">
                      {allocation.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid gap-1 rounded-md bg-muted/40 p-2 sm:grid-cols-4"
                        >
                          <span>Dòng {line.lineNumber}</span>
                          <span>{line.skuCode ?? line.skuId}</span>
                          <span>Đã phân bổ {line.allocatedQuantity}</span>
                          <span>Đặt sau {line.backorderedQuantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">Chưa có phân bổ nào.</div>
              )}
            </div>
          ) : null}

          {order ? (
            <div className="space-y-3 rounded-md border p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Phát hành lấy hàng</h2>
                <span className="text-muted-foreground text-xs">
                  {releasesQuery.data?.totalItems ?? 0} bản ghi
                </span>
              </div>
              {releasesQuery.isLoading ? (
                <div className="text-muted-foreground">Đang tải phát hành lấy hàng...</div>
              ) : releasesQuery.data?.items.length ? (
                releasesQuery.data.items.map((release) => (
                  <div key={release.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{release.releaseNumber}</div>
                      <PickReleaseBadge status={release.status} />
                    </div>
                    <div className="text-muted-foreground grid gap-1 sm:grid-cols-4">
                      <span>Chế độ: {release.releaseMode}</span>
                      <span>Cỡ batch: {release.batchSize}</span>
                      <span>Tác vụ: {release.totalTaskCount}</span>
                      <span>Đã phát hành: {release.totalReleasedQuantity}</span>
                    </div>
                    {release.blockReason ? (
                      <div className="text-destructive">{release.blockReason}</div>
                    ) : null}
                    <div className="space-y-1">
                      {release.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="grid gap-1 rounded-md bg-muted/40 p-2 sm:grid-cols-6"
                        >
                          <span>{task.taskNumber}</span>
                          <span>Thứ tự {task.sequence}</span>
                          <span>{task.skuCode ?? task.skuId}</span>
                          <span>Số lượng {task.quantity}</span>
                          <span>Trạng thái tác vụ {task.status}</span>
                          <span>Từ {task.sourceLocationId}</span>
                          <span>{task.batchNumber ?? 'Rời rạc'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">Chưa có phát hành lấy hàng nào.</div>
              )}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <ActionPanel
            title="Thao tác có kiểm soát"
            description="Giữ, từ chối và hủy yêu cầu mã lý do, bằng chứng khi catalog bắt buộc và khóa idempotency."
            state={mutationError ? 'error' : 'idle'}
            stateMessage={mutationError ?? undefined}
          >
            <div className="grid gap-3">
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
                <Input
                  value={idempotencyKey}
                  onChange={(event) => setIdempotencyKey(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Chính sách phân bổ
                <select
                  className="rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={allocationPolicy}
                  onChange={(event) => setAllocationPolicy(event.target.value as AllocationPolicy)}
                >
                  <option value="PartialBackorder">Backorder một phần</option>
                  <option value="FullOnly">Chỉ đủ toàn bộ</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Chế độ phát hành
                <select
                  className="rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={releaseMode}
                  onChange={(event) => setReleaseMode(event.target.value as PickReleaseMode)}
                >
                  <option value="Discrete">Rời rạc</option>
                  <option value="Batch">Theo batch</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Cỡ batch
                <Input
                  value={batchSize}
                  onChange={(event) => setBatchSize(event.target.value)}
                  inputMode="numeric"
                />
              </label>
            </div>
            {mode === 'detail' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!order}
                  onClick={() => order && mutations.validateOrder.mutate(order.id)}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Xác thực
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReasonAction}
                  onClick={() => runReasonAction('hold')}
                >
                  <PauseCircle className="size-4" aria-hidden="true" />
                  Giữ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReasonAction}
                  onClick={() => runReasonAction('reject')}
                >
                  <ShieldX className="size-4" aria-hidden="true" />
                  Từ chối
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReasonAction}
                  onClick={() => runReasonAction('cancel')}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAllocate}
                  onClick={runAllocate}
                >
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Phân bổ
                </Button>
                <Button type="button" variant="outline" disabled={!canRelease} onClick={runRelease}>
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Phát hành
                </Button>
              </div>
            ) : null}
          </ActionPanel>
        </aside>
      </div>
    </DetailPageShell>
  );
}

export function OutboundCreatePage() {
  return <OutboundDetailPage mode="new" />;
}
