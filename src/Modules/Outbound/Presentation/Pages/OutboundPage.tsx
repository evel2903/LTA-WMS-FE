import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileInput, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useOutboundOrders } from '@modules/Outbound/Application/Queries/UseOutboundOrders';
import { OUTBOUND_ORDER_STATUSES } from '@modules/Outbound/Domain/Constants/OutboundConstants';
import type {
  OutboundOrder,
  OutboundOrderStatus,
} from '@modules/Outbound/Domain/Types/OutboundOrder';

type StatusFilter = 'All' | OutboundOrderStatus;

function StatusBadge({ status }: { status: OutboundOrderStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function OrderRow({ order }: { order: OutboundOrder }) {
  return (
    <Link
      to={ROUTES.OUTBOUND.DETAIL(order.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{order.orderNumber}</div>
          <div className="text-muted-foreground text-xs">{order.businessReference}</div>
        </div>
        <StatusBadge status={order.documentStatus} />
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <div>Customer: {order.customerCode ?? order.customerId ?? 'unresolved'}</div>
        <div>Warehouse: {order.warehouseCode ?? order.warehouseId}</div>
        <div>Lines: {order.lines.length}</div>
      </div>
    </Link>
  );
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Unable to load outbound orders.';
}

export function OutboundPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');

  const query = useOutboundOrders({
    warehouseId: warehouseId.trim() || undefined,
    ownerId: ownerId.trim() || undefined,
    sourceReference: sourceReference.trim() || undefined,
    documentStatus: status === 'All' ? undefined : status,
  });
  const orders = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = apiError?.isForbidden
    ? 'forbidden'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : orders.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Outbound orders"
      description="Scan imported outbound demand and open focused detail/action pages for validation, hold, reject or cancel."
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : query.error
            ? 'Unable to load outbound orders'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for outbound orders.'
          : query.error
            ? (errorMessage(query.error) ?? 'Unable to load outbound orders.')
            : 'No outbound orders match the filters.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.OUTBOUND.NEW}>
            <FileInput className="size-4" aria-hidden="true" />
            Import order
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1 text-sm">
            Warehouse
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Owner
            <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Source reference
            <Input
              value={sourceReference}
              onChange={(event) => setSourceReference(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              <option value="All">All</option>
              {OUTBOUND_ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Loading outbound orders
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}
