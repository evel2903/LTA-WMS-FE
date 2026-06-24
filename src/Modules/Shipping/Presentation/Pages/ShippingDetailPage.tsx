import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PackageCheck, Ship, Truck } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useShippingMutations } from '@modules/Shipping/Application/Commands/UseShippingMutations';
import { useShippingStaging } from '@modules/Shipping/Application/Queries/UseShipping';
import { DEFAULT_SHIPPING_REASON_CODE } from '@modules/Shipping/Domain/Constants/ShippingConstants';
import type {
  ShipmentPackageStaging,
  ShipmentPackageStagingStatus,
} from '@modules/Shipping/Domain/Types/Shipping';

const ACTIONS = new Set(['dock', 'truck']);

function evidence(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Unable to complete shipping action.';
}

function StatusBadge({ status }: { status: ShipmentPackageStagingStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function StagingSummary({ staging }: { staging: ShipmentPackageStaging }) {
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      <h2 className="text-base font-semibold">Staging milestone</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground text-xs">Package</div>
          <div>{staging.packageCode}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Outbound order</div>
          <div>{staging.outboundOrderId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Shipment</div>
          <div>{staging.shipmentReference ?? 'n/a'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Lane</div>
          <div>{staging.stagingLaneCode}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Dock</div>
          <div>{staging.dockDoorCode ?? staging.dockDoorId ?? 'not assigned'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Truck</div>
          <div>{staging.truckReference ?? staging.vehicleNumber ?? 'not assigned'}</div>
        </div>
      </div>
      <div className="text-muted-foreground text-xs">
        Inventory milestone: {staging.inventoryStatusCode ?? 'document-only'}
      </div>
    </div>
  );
}

export function ShippingDetailPage({ mode = 'detail' }: { mode?: 'new' | 'detail' }) {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const stagingQuery = useShippingStaging(mode === 'detail' ? (id ?? null) : null);
  const mutations = useShippingMutations();
  const staging = mode === 'detail' ? (stagingQuery.data ?? null) : null;

  const [packageId, setPackageId] = useState('');
  const [shipmentReference, setShipmentReference] = useState('');
  const [stagingLaneCode, setStagingLaneCode] = useState('');
  const [stagingLocationId, setStagingLocationId] = useState('');
  const [stagingLocationCode, setStagingLocationCode] = useState('');
  const [dockDoorId, setDockDoorId] = useState('');
  const [dockDoorCode, setDockDoorCode] = useState('');
  const [truckReference, setTruckReference] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [carrierCode, setCarrierCode] = useState('');
  const [reasonCode, setReasonCode] = useState(DEFAULT_SHIPPING_REASON_CODE);
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (action && !ACTIONS.has(action)) {
      void navigate(ROUTES.SHIPPING.DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    if (!staging) return;
    setDockDoorId(staging.dockDoorId ?? '');
    setDockDoorCode(staging.dockDoorCode ?? '');
    setTruckReference(staging.truckReference ?? '');
    setVehicleNumber(staging.vehicleNumber ?? '');
    setDriverName(staging.driverName ?? '');
    setCarrierId(staging.carrierId ?? '');
    setCarrierCode(staging.carrierCode ?? '');
  }, [staging]);

  const apiError = stagingQuery.error instanceof ApiError ? stagingQuery.error : null;
  const isBlocked = mode === 'detail' && staging?.status === 'Blocked';
  const isReadOnly = mode === 'detail' && staging?.status === 'ReadyForLoading';
  const state =
    mode === 'new'
      ? null
      : !id
        ? 'notFound'
        : apiError?.isForbidden
          ? 'forbidden'
          : apiError?.status === 404
            ? 'notFound'
            : stagingQuery.isLoading
              ? 'loading'
              : stagingQuery.error
                ? 'error'
                : !staging
                  ? 'notFound'
                  : isBlocked
                    ? 'blocked'
                    : isReadOnly
                      ? 'readOnly'
                      : null;
  const mutationError =
    errorMessage(mutations.stagePackage.error) ??
    errorMessage(mutations.assignDock.error) ??
    errorMessage(mutations.assignTruck.error);
  const commonPayload = {
    reasonCode: reasonCode.trim() || undefined,
    reasonNote: reasonNote.trim() || undefined,
    evidenceRefs: evidence(evidenceRefs),
    idempotencyKey: idempotencyKey.trim(),
  };
  const canStage = Boolean(packageId.trim() && stagingLaneCode.trim() && idempotencyKey.trim());
  const canDock = Boolean(staging && (dockDoorId.trim() || dockDoorCode.trim()) && idempotencyKey.trim());
  const canTruck = Boolean(staging && (truckReference.trim() || vehicleNumber.trim()) && idempotencyKey.trim());

  const handleStage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLastMessage(null);
    mutations.stagePackage.mutate(
      {
        packageId: packageId.trim(),
        shipmentReference: shipmentReference.trim() || undefined,
        stagingLaneCode: stagingLaneCode.trim(),
        stagingLocationId: stagingLocationId.trim() || undefined,
        stagingLocationCode: stagingLocationCode.trim() || undefined,
        ...commonPayload,
      },
      {
        onSuccess: (created) => {
          setIdempotencyKey('');
          void navigate(ROUTES.SHIPPING.DETAIL(created.id));
        },
      },
    );
  };

  const runDock = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.assignDock.mutate(
      {
        id: staging.id,
        payload: {
          dockDoorId: dockDoorId.trim() || undefined,
          dockDoorCode: dockDoorCode.trim() || undefined,
          ...commonPayload,
        },
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Dock milestone recorded');
        },
      },
    );
  };

  const runTruck = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.assignTruck.mutate(
      {
        id: staging.id,
        payload: {
          truckReference: truckReference.trim() || undefined,
          vehicleNumber: vehicleNumber.trim() || undefined,
          driverName: driverName.trim() || undefined,
          carrierId: carrierId.trim() || undefined,
          carrierCode: carrierCode.trim() || undefined,
          ...commonPayload,
        },
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Truck milestone recorded');
        },
      },
    );
  };

  return (
    <DetailPageShell
      title={mode === 'new' ? 'Stage package' : (staging?.stagingCode ?? 'Shipping staging detail')}
      subtitle="Package staging, dock and truck milestones before loading"
      backTo={ROUTES.SHIPPING.ROOT}
      backLabel="Back to shipping"
      status={staging ? <StatusBadge status={staging.status} /> : null}
      summary={
        staging ? (
          <>
            <span>{staging.warehouseCode ?? staging.warehouseId ?? 'warehouse unresolved'}</span>
            <span>{staging.ownerCode ?? staging.ownerId ?? 'owner unresolved'}</span>
            <span>{staging.shipmentReference ?? 'shipment reference pending'}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : isBlocked
            ? 'Shipping staging blocked'
            : isReadOnly
              ? 'Ready for loading'
              : stagingQuery.error
                ? 'Unable to load shipping staging'
                : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for shipment detail.'
          : isBlocked
            ? 'Resolve the blocking condition before changing this staging record.'
            : isReadOnly
              ? 'Dock and truck milestones are complete; loading belongs to the next story.'
              : stagingQuery.error
                ? (errorMessage(stagingQuery.error) ?? 'The shipping staging record could not be loaded.')
                : 'The requested shipping staging record was not found.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <ActionPanel
              title="Stage package"
              description="Only packages already ReadyForStaging can be moved into a staging lane."
              state={mutations.stagePackage.isPending ? 'pending' : 'idle'}
            >
              <form className="space-y-3" onSubmit={handleStage}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Package id
                    <Input value={packageId} onChange={(event) => setPackageId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Shipment reference
                    <Input
                      value={shipmentReference}
                      onChange={(event) => setShipmentReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Staging lane code
                    <Input
                      value={stagingLaneCode}
                      onChange={(event) => setStagingLaneCode(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Staging location id
                    <Input
                      value={stagingLocationId}
                      onChange={(event) => setStagingLocationId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-2">
                    Staging location code
                    <Input
                      value={stagingLocationCode}
                      onChange={(event) => setStagingLocationCode(event.target.value)}
                    />
                  </label>
                </div>
                <Button type="submit" disabled={!canStage || mutations.stagePackage.isPending}>
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Stage package
                </Button>
              </form>
            </ActionPanel>
          ) : null}

          {staging ? <StagingSummary staging={staging} /> : null}
        </section>

        <aside className="space-y-4">
          <ActionPanel
            title="Shipping actions"
            description="Dock and truck milestones require reason/evidence when policy requires it and an idempotency key."
            state={isReadOnly ? 'disabled' : mutationError ? 'error' : 'idle'}
            stateMessage={
              isReadOnly
                ? 'Ready for loading; loading scan is out of scope for this story.'
                : (mutationError ?? undefined)
            }
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
                <Input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
              </label>
              {mode === 'detail' ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      Dock door id
                      <Input value={dockDoorId} onChange={(event) => setDockDoorId(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Dock door code
                      <Input value={dockDoorCode} onChange={(event) => setDockDoorCode(event.target.value)} />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canDock || isReadOnly || mutations.assignDock.isPending}
                    onClick={runDock}
                  >
                    <Ship className="size-4" aria-hidden="true" />
                    Assign dock
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      Truck reference
                      <Input
                        value={truckReference}
                        onChange={(event) => setTruckReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Vehicle number
                      <Input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Driver name
                      <Input value={driverName} onChange={(event) => setDriverName(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Carrier code
                      <Input value={carrierCode} onChange={(event) => setCarrierCode(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">
                      Carrier id
                      <Input value={carrierId} onChange={(event) => setCarrierId(event.target.value)} />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canTruck || isReadOnly || mutations.assignTruck.isPending}
                    onClick={runTruck}
                  >
                    <Truck className="size-4" aria-hidden="true" />
                    Assign truck
                  </Button>
                </>
              ) : null}
              {lastMessage ? <p className="text-sm font-medium">{lastMessage}</p> : null}
            </div>
          </ActionPanel>
        </aside>
      </div>
    </DetailPageShell>
  );
}

export function ShippingCreatePage() {
  return <ShippingDetailPage mode="new" />;
}

