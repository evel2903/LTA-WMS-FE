import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileInput, PackageCheck, PauseCircle, ShieldX, XCircle } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useOutboundMutations } from '@modules/Outbound/Application/Commands/UseOutboundMutations';
import {
  useOutboundAllocations,
  useOutboundOrder,
} from '@modules/Outbound/Application/Queries/UseOutboundOrders';
import type {
  AllocationPolicy,
  AllocationStatus,
  OutboundOrderStatus,
} from '@modules/Outbound/Domain/Types/OutboundOrder';

const ACTIONS = new Set(['hold', 'reject', 'cancel', 'validate', 'allocate']);

function evidence(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Unable to complete outbound action.';
}

function StatusBadge({ status }: { status: OutboundOrderStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function AllocationBadge({ status }: { status: AllocationStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

export function OutboundDetailPage({ mode = 'detail' }: { mode?: 'new' | 'detail' }) {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const orderQuery = useOutboundOrder(mode === 'detail' ? (id ?? null) : null);
  const mutations = useOutboundMutations();
  const order = orderQuery.data ?? null;
  const allocationsQuery = useOutboundAllocations(order?.id ?? null);
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
  const canAllocate = Boolean(order && order.documentStatus === 'Validated' && allocationPayload.idempotencyKey);
  const mutationError =
    errorMessage(mutations.importOrder.error) ??
    errorMessage(mutations.validateOrder.error) ??
    errorMessage(mutations.holdOrder.error) ??
    errorMessage(mutations.rejectOrder.error) ??
    errorMessage(mutations.cancelOrder.error) ??
    errorMessage(mutations.allocateOrder.error);

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

  return (
    <DetailPageShell
      title={mode === 'new' ? 'Import outbound order' : (order?.orderNumber ?? 'Outbound order')}
      subtitle="Outbound import, validation and governed document actions"
      backTo={ROUTES.OUTBOUND.ROOT}
      backLabel="Back to outbound orders"
      status={order ? <StatusBadge status={order.documentStatus} /> : null}
      summary={
        order ? (
          <>
            <span>{order.businessReference}</span>
            <span>{order.customerCode ?? order.customerId ?? 'customer unresolved'}</span>
            <span>{order.warehouseCode ?? order.warehouseId}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : orderQuery.error
            ? 'Unable to load outbound order'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for outbound order detail.'
          : orderQuery.error
            ? (errorMessage(orderQuery.error) ?? 'The outbound order could not be loaded.')
            : 'The requested outbound order was not found.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <ActionPanel
              title="Import order"
              description="Creates validated or held outbound demand from source data."
            >
              <form className="space-y-3" onSubmit={handleImport}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Source system
                    <Input
                      value={sourceSystem}
                      onChange={(event) => setSourceSystem(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Source reference
                    <Input
                      value={sourceReference}
                      onChange={(event) => setSourceReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Customer reference
                    <Input
                      value={customerExternalReference}
                      onChange={(event) => setCustomerExternalReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Ship-to reference
                    <Input
                      value={shipToReference}
                      onChange={(event) => setShipToReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Owner id
                    <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Warehouse id
                    <Input
                      value={warehouseId}
                      onChange={(event) => setWarehouseId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    SKU id
                    <Input value={skuId} onChange={(event) => setSkuId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    UOM id
                    <Input value={uomId} onChange={(event) => setUomId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Quantity
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
                  Import order
                </Button>
              </form>
            </ActionPanel>
          ) : null}

          {order ? (
            <div className="space-y-3 rounded-md border p-4 text-sm">
              <h2 className="text-base font-semibold">Order lines</h2>
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
                  <div className="font-medium">Validation errors</div>
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
                <h2 className="text-base font-semibold">Allocations</h2>
                <span className="text-muted-foreground text-xs">
                  {allocationsQuery.data?.totalItems ?? 0} records
                </span>
              </div>
              {allocationsQuery.isLoading ? (
                <div className="text-muted-foreground">Loading allocations...</div>
              ) : allocationsQuery.data?.items.length ? (
                allocationsQuery.data.items.map((allocation) => (
                  <div key={allocation.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{allocation.allocationNumber}</div>
                      <AllocationBadge status={allocation.status} />
                    </div>
                    <div className="text-muted-foreground grid gap-1 sm:grid-cols-3">
                      <span>Policy: {allocation.policy}</span>
                      <span>Allocated: {allocation.totalAllocatedQuantity}</span>
                      <span>Backorder: {allocation.totalBackorderedQuantity}</span>
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
                          <span>Line {line.lineNumber}</span>
                          <span>{line.skuCode ?? line.skuId}</span>
                          <span>Allocated {line.allocatedQuantity}</span>
                          <span>Backorder {line.backorderedQuantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No allocations recorded.</div>
              )}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <ActionPanel
            title="Governed actions"
            description="Hold, reject and cancel require reason, evidence when catalog requires it, and idempotency."
            state={mutationError ? 'error' : 'idle'}
            stateMessage={mutationError ?? undefined}
          >
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                Reason code
                <Input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
              </label>
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
                <Input
                  value={idempotencyKey}
                  onChange={(event) => setIdempotencyKey(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Allocation policy
                <select
                  className="rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={allocationPolicy}
                  onChange={(event) => setAllocationPolicy(event.target.value as AllocationPolicy)}
                >
                  <option value="PartialBackorder">Partial backorder</option>
                  <option value="FullOnly">Full only</option>
                </select>
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
                  Validate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReasonAction}
                  onClick={() => runReasonAction('hold')}
                >
                  <PauseCircle className="size-4" aria-hidden="true" />
                  Hold
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReasonAction}
                  onClick={() => runReasonAction('reject')}
                >
                  <ShieldX className="size-4" aria-hidden="true" />
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReasonAction}
                  onClick={() => runReasonAction('cancel')}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAllocate}
                  onClick={runAllocate}
                >
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Allocate
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
