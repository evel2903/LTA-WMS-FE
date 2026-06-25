import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, PackageCheck, ScanLine, Ship, Truck } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useShippingMutations } from '@modules/Shipping/Application/Commands/UseShippingMutations';
import { useShippingStaging } from '@modules/Shipping/Application/Queries/UseShipping';
import { DEFAULT_SHIPPING_REASON_CODE } from '@modules/Shipping/Domain/Constants/ShippingConstants';
import type {
  ShipmentPackageStaging,
  ShipmentPackageStagingStatus,
} from '@modules/Shipping/Domain/Types/Shipping';

const ACTIONS = new Set(['dock', 'truck', 'loading', 'gate-out', 'goods-issue-trigger', 'goods-issue']);

function evidence(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể hoàn tất thao tác giao hàng.';
}

function StatusBadge({ status }: { status: ShipmentPackageStagingStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function StagingSummary({ staging }: { staging: ShipmentPackageStaging }) {
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      <h2 className="text-base font-semibold">Mốc staging</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground text-xs">Kiện hàng</div>
          <div>{staging.packageCode}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Đơn xuất kho</div>
          <div>{staging.outboundOrderId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Lô giao hàng</div>
          <div>{staging.shipmentReference ?? 'không áp dụng'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Làn staging</div>
          <div>{staging.stagingLaneCode}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Cửa dock</div>
          <div>{staging.dockDoorCode ?? staging.dockDoorId ?? 'chưa gán'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Xe tải</div>
          <div>{staging.truckReference ?? staging.vehicleNumber ?? 'chưa gán'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Chất hàng</div>
          <div>{staging.loadReference ?? 'chưa chất hàng'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Đã chất hàng lúc</div>
          <div>{staging.loadedAt ?? 'chưa chất hàng'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Xác nhận lúc</div>
          <div>{staging.shipmentConfirmedAt ?? 'chưa xác nhận'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Gate-out</div>
          <div>{staging.gateOutAt ?? 'chưa ghi nhận'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Kích hoạt ghi nhận xuất kho</div>
          <div>{staging.goodsIssueTriggerStatus ? vietnameseOperationalLabel(staging.goodsIssueTriggerStatus) : 'chưa đánh giá'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Trạng thái ghi nhận xuất kho</div>
          <div>{staging.goodsIssueStatus ? vietnameseOperationalLabel(staging.goodsIssueStatus) : 'chưa ghi nhận'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Giao dịch xuất kho</div>
          <div>{staging.goodsIssueInventoryTransactionId ?? 'đang chờ'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Sự kiện đang chờ</div>
          <div>{staging.goodsIssueOutboxMessageId ?? staging.shipmentClosedOutboxMessageId ?? 'đang chờ'}</div>
        </div>
      </div>
      <div className="text-muted-foreground text-xs">
        Mốc tồn kho: {staging.inventoryStatusCode ?? 'chỉ ở chứng từ'}
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
  const [scannedPackageId, setScannedPackageId] = useState('');
  const [scannedPackageCode, setScannedPackageCode] = useState('');
  const [loadReference, setLoadReference] = useState('');
  const [loadingShipmentReference, setLoadingShipmentReference] = useState('');
  const [loadingTruckReference, setLoadingTruckReference] = useState('');
  const [loadingVehicleNumber, setLoadingVehicleNumber] = useState('');
  const [gateOutReference, setGateOutReference] = useState('');
  const [gateOutTruckReference, setGateOutTruckReference] = useState('');
  const [gateOutVehicleNumber, setGateOutVehicleNumber] = useState('');
  const [requireFullLoad, setRequireFullLoad] = useState(true);
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
    setScannedPackageId(staging.packageId);
    setScannedPackageCode(staging.packageCode);
    setLoadReference(staging.loadReference ?? '');
    setLoadingShipmentReference(staging.shipmentReference ?? '');
    setLoadingTruckReference(staging.truckReference ?? '');
    setLoadingVehicleNumber(staging.vehicleNumber ?? '');
    setGateOutReference(staging.gateOutReference ?? '');
    setGateOutTruckReference(staging.truckReference ?? '');
    setGateOutVehicleNumber(staging.vehicleNumber ?? '');
  }, [staging]);

  const apiError = stagingQuery.error instanceof ApiError ? stagingQuery.error : null;
  const isBlocked = mode === 'detail' && staging?.status === 'Blocked';
  const isGoodsIssuePosted = mode === 'detail' && staging?.goodsIssueStatus === 'Posted';
  const isLoadingAction = action === 'loading';
  const isGateOutAction = action === 'gate-out';
  const isGoodsIssueTriggerAction = action === 'goods-issue-trigger';
  const isGoodsIssueAction = action === 'goods-issue';
  const isReadOnly = isGoodsIssuePosted;

  useEffect(() => {
    setReasonCode(
      isGoodsIssueTriggerAction || isGoodsIssueAction
        ? 'RC-V1-GOODS-ISSUE-CORRECTION'
        : DEFAULT_SHIPPING_REASON_CODE,
    );
  }, [isGoodsIssueAction, isGoodsIssueTriggerAction]);

  const canAssignDockOrTruck = Boolean(
    staging &&
    staging.status !== 'ReadyForLoading' &&
    staging.status !== 'Loaded' &&
    staging.status !== 'ShipmentConfirmed' &&
    staging.status !== 'GateOutRecorded',
  );
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
    errorMessage(mutations.assignTruck.error) ??
    errorMessage(mutations.scanLoading.error) ??
    errorMessage(mutations.confirmShipment.error) ??
    errorMessage(mutations.recordGateOut.error) ??
    errorMessage(mutations.evaluateGoodsIssueTrigger.error) ??
    errorMessage(mutations.postGoodsIssue.error);
  const commonPayload = {
    reasonCode: reasonCode.trim() || undefined,
    reasonNote: reasonNote.trim() || undefined,
    evidenceRefs: evidence(evidenceRefs),
    idempotencyKey: idempotencyKey.trim(),
  };
  const canStage = Boolean(packageId.trim() && stagingLaneCode.trim() && idempotencyKey.trim());
  const canDock = Boolean(
    canAssignDockOrTruck && (dockDoorId.trim() || dockDoorCode.trim()) && idempotencyKey.trim(),
  );
  const canTruck = Boolean(
    canAssignDockOrTruck &&
    (truckReference.trim() || vehicleNumber.trim()) &&
    idempotencyKey.trim(),
  );
  const canScanLoading = Boolean(
    staging &&
    staging.status === 'ReadyForLoading' &&
    idempotencyKey.trim() &&
    (scannedPackageId.trim() || scannedPackageCode.trim()),
  );
  const canConfirmShipment = Boolean(
    staging && staging.status === 'Loaded' && idempotencyKey.trim(),
  );
  const canRecordGateOut = Boolean(
    staging && staging.status === 'ShipmentConfirmed' && idempotencyKey.trim(),
  );
  const canEvaluateGoodsIssueTrigger = Boolean(
    staging && staging.goodsIssueTriggerStatus !== 'Ready' && idempotencyKey.trim(),
  );
  const canPostGoodsIssue = Boolean(
    staging &&
    staging.goodsIssueTriggerStatus === 'Ready' &&
    staging.goodsIssueStatus !== 'Posted' &&
    idempotencyKey.trim(),
  );
  const canOpenGoodsIssueTrigger = Boolean(
    staging &&
    staging.goodsIssueTriggerStatus !== 'Ready' &&
    ['Loaded', 'ShipmentConfirmed', 'GateOutRecorded'].includes(staging.status),
  );
  const canOpenGoodsIssue = Boolean(
    staging && staging.goodsIssueTriggerStatus === 'Ready' && staging.goodsIssueStatus !== 'Posted',
  );

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
          setLastMessage('Đã ghi nhận mốc cửa dock');
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
          setLastMessage('Đã ghi nhận mốc xe tải');
        },
      },
    );
  };

  const runScanLoading = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.scanLoading.mutate(
      {
        id: staging.id,
        payload: {
          scannedPackageId: scannedPackageId.trim() || undefined,
          scannedPackageCode: scannedPackageCode.trim() || undefined,
          shipmentReference: loadingShipmentReference.trim() || undefined,
          loadReference: loadReference.trim() || undefined,
          truckReference: loadingTruckReference.trim() || undefined,
          vehicleNumber: loadingVehicleNumber.trim() || undefined,
          ...commonPayload,
        },
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Đã ghi nhận quét chất hàng');
        },
      },
    );
  };

  const runConfirmShipment = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.confirmShipment.mutate(
      {
        id: staging.id,
        payload: {
          shipmentReference: loadingShipmentReference.trim() || undefined,
          requireFullLoad: requireFullLoad,
          ...commonPayload,
        },
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Đã xác nhận lô giao hàng');
        },
      },
    );
  };

  const runRecordGateOut = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.recordGateOut.mutate(
      {
        id: staging.id,
        payload: {
          gateOutReference: gateOutReference.trim() || undefined,
          truckReference: gateOutTruckReference.trim() || undefined,
          vehicleNumber: gateOutVehicleNumber.trim() || undefined,
          ...commonPayload,
        },
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Gate-out recorded');
        },
      },
    );
  };

  const runEvaluateGoodsIssueTrigger = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.evaluateGoodsIssueTrigger.mutate(
      {
        id: staging.id,
        payload: commonPayload,
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Đã đánh giá kích hoạt ghi nhận xuất kho');
        },
      },
    );
  };

  const runPostGoodsIssue = () => {
    if (!staging) return;
    setLastMessage(null);
    mutations.postGoodsIssue.mutate(
      {
        id: staging.id,
        payload: commonPayload,
      },
      {
        onSuccess: () => {
          setIdempotencyKey('');
          setLastMessage('Đã ghi nhận xuất kho và đưa sự kiện hạ nguồn vào hàng đợi');
        },
      },
    );
  };

  return (
    <DetailPageShell
      title={mode === 'new' ? 'Đưa kiện vào staging' : (staging?.stagingCode ?? 'Chi tiết staging giao hàng')}
      subtitle="Staging kiện, cửa dock, xe tải, quét chất hàng, xác nhận lô giao hàng và cổng ra"
      backTo={ROUTES.SHIPPING.ROOT}
      backLabel="Quay lại giao hàng"
      status={staging ? <StatusBadge status={staging.status} /> : null}
      summary={
        staging ? (
          <>
            <span>{staging.warehouseCode ?? staging.warehouseId ?? 'kho chưa xác định'}</span>
            <span>{staging.ownerCode ?? staging.ownerId ?? 'chủ hàng chưa xác định'}</span>
            <span>{staging.shipmentReference ?? 'đang chờ tham chiếu lô giao hàng'}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : isBlocked
            ? 'Staging giao hàng bị chặn'
            : isReadOnly
              ? 'Đã ghi nhận xuất kho'
              : stagingQuery.error
                ? 'Không thể tải staging giao hàng'
                : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Không có quyền xem chi tiết lô giao hàng.'
          : isBlocked
            ? 'Hãy xử lý điều kiện chặn trước khi thay đổi bản ghi staging này.'
            : isReadOnly
              ? 'Ghi nhận xuất kho đã được ghi nhận; bản ghi giao hàng này chỉ đọc.'
              : stagingQuery.error
                ? (errorMessage(stagingQuery.error) ??
                  'Không thể tải bản ghi staging giao hàng.')
                : 'Không tìm thấy bản ghi staging giao hàng được yêu cầu.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <ActionPanel
              title="Đưa kiện vào staging"
              description="Chỉ kiện hàng đủ điều kiện staging mới được chuyển vào làn staging."
              state={mutations.stagePackage.isPending ? 'pending' : 'idle'}
            >
              <form className="space-y-3" onSubmit={handleStage}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    ID kiện hàng
                    <Input
                      value={packageId}
                      onChange={(event) => setPackageId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Tham chiếu lô giao hàng
                    <Input
                      value={shipmentReference}
                      onChange={(event) => setShipmentReference(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Mã làn staging
                    <Input
                      value={stagingLaneCode}
                      onChange={(event) => setStagingLaneCode(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID vị trí staging
                    <Input
                      value={stagingLocationId}
                      onChange={(event) => setStagingLocationId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-2">
                    Mã vị trí staging
                    <Input
                      value={stagingLocationCode}
                      onChange={(event) => setStagingLocationCode(event.target.value)}
                    />
                  </label>
                </div>
                <Button type="submit" disabled={!canStage || mutations.stagePackage.isPending}>
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Đưa kiện vào staging
                </Button>
              </form>
            </ActionPanel>
          ) : null}

          {staging ? <StagingSummary staging={staging} /> : null}
          {staging?.status === 'ReadyForLoading' || staging?.status === 'Loaded' ? (
            <Button asChild variant="outline" className="min-w-0 whitespace-normal text-center">
              <Link to={ROUTES.SHIPPING.ACTION(staging.id, 'loading')}>
                <ScanLine className="size-4" aria-hidden="true" />
                Mở chất hàng
              </Link>
            </Button>
          ) : null}
          {staging?.status === 'ShipmentConfirmed' ? (
            <Button asChild variant="outline" className="min-w-0 whitespace-normal text-center">
              <Link to={ROUTES.SHIPPING.ACTION(staging.id, 'gate-out')}>
                <Ship className="size-4" aria-hidden="true" />
                Mở cổng ra
              </Link>
            </Button>
          ) : null}
          {staging && canOpenGoodsIssueTrigger ? (
            <Button asChild variant="outline" className="min-w-0 whitespace-normal text-center">
              <Link to={ROUTES.SHIPPING.ACTION(staging.id, 'goods-issue-trigger')}>
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Mở kích hoạt ghi nhận xuất kho
              </Link>
            </Button>
          ) : null}
          {staging && canOpenGoodsIssue ? (
            <Button asChild variant="outline" className="min-w-0 whitespace-normal text-center">
              <Link to={ROUTES.SHIPPING.ACTION(staging.id, 'goods-issue')}>
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Mở ghi nhận xuất kho
              </Link>
            </Button>
          ) : null}
        </section>

        <aside className="space-y-4">
          <ActionPanel
            title={
              isLoadingAction
                ? 'Thao tác chất hàng'
                : isGateOutAction
                  ? 'Thao tác cổng ra'
                  : isGoodsIssueTriggerAction
                    ? 'Kích hoạt ghi nhận xuất kho'
                    : isGoodsIssueAction
                      ? 'Ghi nhận xuất kho'
                    : 'Thao tác giao hàng'
            }
            description={
              isLoadingAction
                ? 'Quét chất hàng và xác nhận lô giao hàng với lý do/bằng chứng và khóa idempotency.'
                : isGateOutAction
                  ? 'Ghi nhận cổng ra sau khi xác nhận lô giao hàng và kích hoạt ghi nhận xuất kho khi strategy hồ sơ yêu cầu.'
                  : isGoodsIssueTriggerAction
                    ? 'Đánh giá kích hoạt ghi nhận xuất kho bằng strategy WarehouseProfile.'
                    : isGoodsIssueAction
                      ? 'Ghi nhận xuất kho WMS một lần và đưa sự kiện hạ nguồn vào hàng đợi.'
                    : 'Mốc dock và xe tải yêu cầu lý do/bằng chứng khi chính sách yêu cầu và cần khóa idempotency.'
            }
            state={isReadOnly ? 'disabled' : mutationError ? 'error' : 'idle'}
            stateMessage={
              isReadOnly
                ? 'Ghi nhận xuất kho đã được ghi nhận; bản ghi giao hàng này chỉ đọc.'
                : (mutationError ?? undefined)
            }
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
              {mode === 'detail' && isLoadingAction ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      ID kiện đã quét
                      <Input
                        value={scannedPackageId}
                        onChange={(event) => setScannedPackageId(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Mã kiện đã quét
                      <Input
                        value={scannedPackageCode}
                        onChange={(event) => setScannedPackageCode(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tham chiếu lô giao hàng
                      <Input
                        value={loadingShipmentReference}
                        onChange={(event) => setLoadingShipmentReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tham chiếu chất hàng
                      <Input
                        value={loadReference}
                        onChange={(event) => setLoadReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tham chiếu xe tải
                      <Input
                        value={loadingTruckReference}
                        onChange={(event) => setLoadingTruckReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Biển số xe
                      <Input
                        value={loadingVehicleNumber}
                        onChange={(event) => setLoadingVehicleNumber(event.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 whitespace-normal text-center"
                    disabled={!canScanLoading || isReadOnly || mutations.scanLoading.isPending}
                    onClick={runScanLoading}
                  >
                    <ScanLine className="size-4" aria-hidden="true" />
                    Quét chất hàng
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={requireFullLoad}
                      onChange={(event) => setRequireFullLoad(event.target.checked)}
                    />
                    Yêu cầu chất đủ hàng
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 whitespace-normal text-center"
                    disabled={
                      !canConfirmShipment || isReadOnly || mutations.confirmShipment.isPending
                    }
                    onClick={runConfirmShipment}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Xác nhận lô giao hàng
                  </Button>
                </>
              ) : mode === 'detail' && isGateOutAction ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      Tham chiếu cổng ra
                      <Input
                        value={gateOutReference}
                        onChange={(event) => setGateOutReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tham chiếu xe tải
                      <Input
                        value={gateOutTruckReference}
                        onChange={(event) => setGateOutTruckReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">
                      Biển số xe
                      <Input
                        value={gateOutVehicleNumber}
                        onChange={(event) => setGateOutVehicleNumber(event.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canRecordGateOut || isReadOnly || mutations.recordGateOut.isPending}
                    onClick={runRecordGateOut}
                  >
                    <Ship className="size-4" aria-hidden="true" />
                    Ghi nhận cổng ra
                  </Button>
                </>
              ) : mode === 'detail' && isGoodsIssueTriggerAction ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 whitespace-normal text-center"
                  disabled={
                    !canEvaluateGoodsIssueTrigger ||
                    isReadOnly ||
                    mutations.evaluateGoodsIssueTrigger.isPending
                  }
                  onClick={runEvaluateGoodsIssueTrigger}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Đánh giá kích hoạt ghi nhận xuất kho
                </Button>
              ) : mode === 'detail' && isGoodsIssueAction ? (
                <>
                  <div className="space-y-1 rounded-md border p-3 text-sm">
                    <div className="font-medium">Sự kiện hạ nguồn đang chờ</div>
                    <div className="text-muted-foreground">
                      Sự kiện ghi nhận xuất kho và đóng lô giao hàng vẫn chờ đến khi điều phối tích hợp xử lý.
                    </div>
                    <div>Chủ hàng: {staging?.ownerCode ?? staging?.ownerId ?? 'không áp dụng'}</div>
                    <div>Kho: {staging?.warehouseCode ?? staging?.warehouseId ?? 'không áp dụng'}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 whitespace-normal text-center"
                    disabled={!canPostGoodsIssue || isReadOnly || mutations.postGoodsIssue.isPending}
                    onClick={runPostGoodsIssue}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Ghi nhận xuất kho
                  </Button>
                </>
              ) : mode === 'detail' ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      ID cửa dock
                      <Input
                        value={dockDoorId}
                        onChange={(event) => setDockDoorId(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Mã cửa dock
                      <Input
                        value={dockDoorCode}
                        onChange={(event) => setDockDoorCode(event.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 whitespace-normal text-center"
                    disabled={!canDock || isReadOnly || mutations.assignDock.isPending}
                    onClick={runDock}
                  >
                    <Ship className="size-4" aria-hidden="true" />
                    Gán dock
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      Tham chiếu xe tải
                      <Input
                        value={truckReference}
                        onChange={(event) => setTruckReference(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Biển số xe
                      <Input
                        value={vehicleNumber}
                        onChange={(event) => setVehicleNumber(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tên tài xế
                      <Input
                        value={driverName}
                        onChange={(event) => setDriverName(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Mã carrier
                      <Input
                        value={carrierCode}
                        onChange={(event) => setCarrierCode(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">
                      ID carrier
                      <Input
                        value={carrierId}
                        onChange={(event) => setCarrierId(event.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canTruck || isReadOnly || mutations.assignTruck.isPending}
                    onClick={runTruck}
                  >
                    <Truck className="size-4" aria-hidden="true" />
                    Gán xe tải
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
