import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useShippingStagingList } from '@modules/Shipping/Application/Queries/UseShipping';
import { SHIPPING_STAGING_STATUSES } from '@modules/Shipping/Domain/Constants/ShippingConstants';
import type {
  ShipmentPackageStaging,
  ShipmentPackageStagingStatus,
} from '@modules/Shipping/Domain/Types/Shipping';

type StatusFilter = 'All' | ShipmentPackageStagingStatus;

function StatusBadge({ status }: { status: ShipmentPackageStagingStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Unable to load shipping staging records.';
}

function StagingRow({ staging }: { staging: ShipmentPackageStaging }) {
  return (
    <Link
      to={ROUTES.SHIPPING.DETAIL(staging.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{staging.stagingCode}</div>
          <div className="text-muted-foreground text-xs">{staging.packageCode}</div>
        </div>
        <StatusBadge status={staging.status} />
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <div>Lane: {staging.stagingLaneCode}</div>
        <div>Shipment: {staging.shipmentReference ?? staging.outboundOrderId}</div>
        <div>Dock: {staging.dockDoorCode ?? staging.dockDoorId ?? 'not assigned'}</div>
        <div>Truck: {staging.truckReference ?? staging.vehicleNumber ?? 'not assigned'}</div>
      </div>
    </Link>
  );
}

export function ShippingPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [outboundOrderId, setOutboundOrderId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');

  const query = useShippingStagingList({
    warehouseId: warehouseId.trim() || undefined,
    ownerId: ownerId.trim() || undefined,
    packageId: packageId.trim() || undefined,
    outboundOrderId: outboundOrderId.trim() || undefined,
    status: status === 'All' ? undefined : status,
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = apiError?.isForbidden
    ? 'forbidden'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Shipping staging"
      description="Scan staged packages and open detail pages for dock and truck milestones."
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : query.error
            ? 'Unable to load shipping staging'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for shipment read.'
          : query.error
            ? (errorMessage(query.error) ?? 'Unable to load shipping staging records.')
            : 'No shipping staging records match the filters.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.SHIPPING.NEW}>
            <PackageCheck className="size-4" aria-hidden="true" />
            Stage package
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-5">
          <label className="grid gap-1 text-sm">
            Warehouse
            <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Owner
            <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Package
            <Input value={packageId} onChange={(event) => setPackageId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Outbound order
            <Input value={outboundOrderId} onChange={(event) => setOutboundOrderId(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              <option value="All">All</option>
              {SHIPPING_STAGING_STATUSES.map((item) => (
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
          Loading shipping staging
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <StagingRow key={item.id} staging={item} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}

