import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, PackageCheck, PackagePlus, Printer } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { usePackingMutations } from '@modules/Packing/Application/Commands/UsePackingMutations';
import { usePackage } from '@modules/Packing/Application/Queries/UsePacking';
import {
  DEFAULT_PACKAGE_CARTON_TYPE,
  DEFAULT_PACKING_REASON_CODE,
  PACKAGE_CHECK_RESULTS,
} from '@modules/Packing/Domain/Constants/PackingConstants';
import type {
  PackSession,
  Package,
  PackageCheckResult,
  PackageStatus,
} from '@modules/Packing/Domain/Types/Packing';

const ACTIONS = new Set(['close', 'ready-for-staging']);

function evidence(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Không thể hoàn tất thao tác đóng gói.';
}

function StatusBadge({ status }: { status: PackageStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function SessionBadge({ session }: { session: PackSession }) {
  return (
    <span className="rounded-md border px-2 py-1 text-xs font-medium">
      {vietnameseOperationalLabel(session.status)} / {vietnameseOperationalLabel(session.checkResult)}
    </span>
  );
}

function PackageSummary({ pack }: { pack: Package }) {
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      <h2 className="text-base font-semibold">Nội dung kiện hàng</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground text-xs">Phiên đóng gói</div>
          <div>{pack.packSessionId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Tác vụ lấy hàng</div>
          <div>{pack.pickTaskId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Đơn xuất kho</div>
          <div>{pack.outboundOrderId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Thùng</div>
          <div>{pack.cartonType}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Khối lượng</div>
          <div>{pack.weight ?? 'không áp dụng'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Kích thước</div>
          <div>
            {[pack.length, pack.width, pack.height].every((item) => typeof item === 'number')
              ? `${pack.length} x ${pack.width} x ${pack.height}`
              : 'không áp dụng'}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {pack.contents.map((content) => (
          <div key={content.id} className="grid gap-1 rounded-md border p-3 sm:grid-cols-5">
            <span>{content.skuCode ?? content.skuId}</span>
            <span>Số lượng {content.quantity}</span>
            <span>{content.uomCode ?? content.uomId}</span>
            <span>{content.inventoryStatusCode ?? 'Chưa có trạng thái tồn kho'}</span>
            <span className="space-y-0.5">
              {content.lotNumber ? <div>Lô: {content.lotNumber}</div> : null}
              {content.serialNumber ? <div>Serial: {content.serialNumber}</div> : null}
              {content.expiryDate ? <div>Hạn dùng: {content.expiryDate}</div> : null}
              {!content.lotNumber && !content.serialNumber && !content.expiryDate ? (
                <div>Chưa có dữ liệu lô</div>
              ) : null}
            </span>
          </div>
        ))}
      </div>
      {pack.labelBlockingDecision ? (
        <div className="rounded-md border p-3">
          <div className="font-medium">Cổng kiểm soát nhãn</div>
          <div className="text-muted-foreground">
            {vietnameseOperationalLabel(pack.labelBlockingDecision)} | {pack.labelPrintJobCode ?? pack.labelPrintJobId ?? 'Chưa có lệnh in'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PackingDetailPage({ mode = 'detail' }: { mode?: 'new' | 'detail' }) {
  const { id, action } = useParams();
  const navigate = useNavigate();
  const packageQuery = usePackage(mode === 'detail' ? (id ?? null) : null);
  const mutations = usePackingMutations();
  const pack = mode === 'detail' ? (packageQuery.data ?? null) : null;
  const [session, setSession] = useState<PackSession | null>(null);
  const [pickTaskId, setPickTaskId] = useState('');
  const [mobileTaskId, setMobileTaskId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [checkRequired, setCheckRequired] = useState(false);
  const [checkResult, setCheckResult] = useState<PackageCheckResult>('Passed');
  const [observedQuantity, setObservedQuantity] = useState('');
  const [observedSkuId, setObservedSkuId] = useState('');
  const [observedSkuCode, setObservedSkuCode] = useState('');
  const [cartonType, setCartonType] = useState(DEFAULT_PACKAGE_CARTON_TYPE);
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [labelType, setLabelType] = useState('');
  const [attemptOverride, setAttemptOverride] = useState(false);
  const [reasonCode, setReasonCode] = useState(DEFAULT_PACKING_REASON_CODE);
  const [reasonNote, setReasonNote] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [lastReadyMessage, setLastReadyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (action && !ACTIONS.has(action)) {
      void navigate(ROUTES.PACKING.DETAIL(id ?? ''), { replace: true });
    }
  }, [action, id, navigate]);

  useEffect(() => {
    if (!pack) return;
    setCartonType(pack.cartonType);
    setWeight(pack.weight?.toString() ?? '');
    setLength(pack.length?.toString() ?? '');
    setWidth(pack.width?.toString() ?? '');
    setHeight(pack.height?.toString() ?? '');
  }, [pack]);

  const apiError = packageQuery.error instanceof ApiError ? packageQuery.error : null;
  const isBlockedPackage = mode === 'detail' && pack?.status === 'Blocked';
  const isReadOnlyPackage = mode === 'detail' && pack?.status === 'ReadyForStaging';
  const state =
    mode === 'new'
      ? null
      : !id
        ? 'notFound'
        : apiError?.isForbidden
          ? 'forbidden'
          : apiError?.status === 404
            ? 'notFound'
            : packageQuery.isLoading
              ? 'loading'
            : packageQuery.error
              ? 'error'
              : !pack
                ? 'notFound'
                : isBlockedPackage
                  ? 'blocked'
                  : isReadOnlyPackage
                    ? 'readOnly'
                    : null;

  const commonPayload = useMemo(
    () => ({
      reasonCode: reasonCode.trim() || undefined,
      reasonNote: reasonNote.trim() || undefined,
      evidenceRefs: evidence(evidenceRefs),
      idempotencyKey: idempotencyKey.trim(),
    }),
    [evidenceRefs, idempotencyKey, reasonCode, reasonNote],
  );
  const cartonPayload = useMemo(
    () => ({
      cartonType: cartonType.trim() || undefined,
      weight: numberOrUndefined(weight),
      length: numberOrUndefined(length),
      width: numberOrUndefined(width),
      height: numberOrUndefined(height),
      ...commonPayload,
    }),
    [cartonType, commonPayload, height, length, weight, width],
  );
  const mutationError =
    errorMessage(mutations.startSession.error) ??
    errorMessage(mutations.recordCheck.error) ??
    errorMessage(mutations.createPackage.error) ??
    errorMessage(mutations.closePackage.error) ??
    errorMessage(mutations.readyForStaging.error);
  const canStart = Boolean(pickTaskId.trim() && warehouseProfileId.trim() && idempotencyKey.trim());
  const canCheck = Boolean(session && idempotencyKey.trim());
  const canCreate = Boolean(session && cartonType.trim() && idempotencyKey.trim());
  const canClose = Boolean(pack && pack.status === 'PackingPending' && idempotencyKey.trim());
  const canReady = Boolean(pack && pack.status === 'Packed' && idempotencyKey.trim());

  const handleStartSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutations.startSession.mutate(
      {
        pickTaskId: pickTaskId.trim(),
        mobileTaskId: mobileTaskId.trim() || undefined,
        warehouseProfileId: warehouseProfileId.trim(),
        ...(checkRequired ? { checkRequired: true } : {}),
        ...commonPayload,
        idempotencyKey: commonPayload.idempotencyKey,
      },
      {
        onSuccess: (created) => {
          setSession(created);
          setIdempotencyKey('');
        },
      },
    );
  };

  const runCheck = () => {
    if (!session) return;
    mutations.recordCheck.mutate(
      {
        sessionId: session.id,
        payload: {
          checkResult,
          observedQuantity: numberOrUndefined(observedQuantity),
          observedSkuId: observedSkuId.trim() || undefined,
          observedSkuCode: observedSkuCode.trim() || undefined,
          weight: numberOrUndefined(weight),
          ...commonPayload,
          idempotencyKey: commonPayload.idempotencyKey,
        },
      },
      {
        onSuccess: (updated) => {
          setSession(updated);
          setIdempotencyKey('');
        },
      },
    );
  };

  const runCreatePackage = () => {
    if (!session || !cartonPayload.cartonType) return;
    mutations.createPackage.mutate(
      {
        packSessionId: session.id,
        cartonType: cartonPayload.cartonType,
        weight: cartonPayload.weight,
        length: cartonPayload.length,
        width: cartonPayload.width,
        height: cartonPayload.height,
        contents: [{ pickTaskId: session.pickTaskId, quantity: numberOrUndefined(observedQuantity) }],
        ...commonPayload,
        idempotencyKey: commonPayload.idempotencyKey,
      },
      {
        onSuccess: (created) => {
          setIdempotencyKey('');
          void navigate(ROUTES.PACKING.DETAIL(created.id));
        },
      },
    );
  };

  const runClosePackage = () => {
    if (!pack) return;
    mutations.closePackage.mutate(
      {
        id: pack.id,
        payload: {
          cartonType: cartonPayload.cartonType,
          weight: cartonPayload.weight,
          length: cartonPayload.length,
          width: cartonPayload.width,
          height: cartonPayload.height,
          ...commonPayload,
          idempotencyKey: commonPayload.idempotencyKey,
        },
      },
      { onSuccess: () => setIdempotencyKey('') },
    );
  };

  const runReadyForStaging = () => {
    if (!pack) return;
    setLastReadyMessage(null);
    mutations.readyForStaging.mutate(
      {
        id: pack.id,
        payload: {
          attemptOverride,
          labelType: labelType.trim() || undefined,
          ...commonPayload,
          idempotencyKey: commonPayload.idempotencyKey,
        },
      },
      {
        onSuccess: (result) => {
          setIdempotencyKey('');
          setLastReadyMessage(
            result.labelValidation.blocked
              ? `Cổng kiểm soát nhãn bị chặn: ${result.labelValidation.reason}`
              : result.isDuplicate
                ? 'Sẵn sàng staging đã được ghi nhận trước đó'
                : 'Đã ghi nhận sẵn sàng staging',
          );
        },
      },
    );
  };

  return (
    <DetailPageShell
      title={mode === 'new' ? 'Quy trình tạo kiện hàng mới' : (pack?.packageCode ?? 'Chi tiết kiện hàng')}
      subtitle="Thao tác kiểm tra, đóng gói, cổng nhãn và sẵn sàng staging"
      backTo={ROUTES.PACKING.ROOT}
      backLabel="Quay lại kiện hàng"
      status={pack ? <StatusBadge status={pack.status} /> : session ? <SessionBadge session={session} /> : null}
      summary={
        pack ? (
          <>
            <span>{pack.warehouseCode ?? pack.warehouseId ?? 'chưa xác định kho'}</span>
            <span>{pack.ownerCode ?? pack.ownerId ?? 'chưa xác định chủ hàng'}</span>
            <span>{pack.checkRequired ? `Kiểm tra ${vietnameseOperationalLabel(pack.checkResult)}` : 'Không yêu cầu kiểm tra'}</span>
          </>
        ) : session ? (
          <>
            <span>{session.sessionNumber}</span>
            <span>{session.pickTaskId}</span>
            <span>
              {session.checkRequired
                ? `Kiểm tra ${vietnameseOperationalLabel(session.checkResult)}`
                : 'Không yêu cầu kiểm tra'}
            </span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Từ chối quyền truy cập'
          : isBlockedPackage
            ? 'Kiện hàng bị chặn'
            : isReadOnlyPackage
              ? 'Kiện hàng chỉ đọc'
          : packageQuery.error
            ? 'Không thể tải kiện hàng'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Bạn không có quyền xem chi tiết kiện hàng.'
          : isBlockedPackage
            ? 'Hãy xử lý điều kiện chặn trước khi thay đổi kiện hàng này.'
            : isReadOnlyPackage
              ? 'Kiện hàng đã sẵn sàng staging; thao tác thay đổi bị tắt.'
          : packageQuery.error
            ? (errorMessage(packageQuery.error) ?? 'Không thể tải kiện hàng.')
            : 'Không tìm thấy kiện hàng được yêu cầu.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <ActionPanel
              title="Bắt đầu phiên đóng gói"
              description="Tạo phiên đóng gói từ tác vụ lấy hàng đã hoàn tất."
              state={mutations.startSession.isPending ? 'pending' : 'idle'}
            >
              <form className="space-y-3" onSubmit={handleStartSession}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    ID tác vụ lấy hàng
                    <Input value={pickTaskId} onChange={(event) => setPickTaskId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID tác vụ mobile
                    <Input
                      value={mobileTaskId}
                      onChange={(event) => setMobileTaskId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID hồ sơ kho
                    <Input
                      value={warehouseProfileId}
                      onChange={(event) => setWarehouseProfileId(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      checked={checkRequired}
                      onChange={(event) => setCheckRequired(event.target.checked)}
                    />
                    Bắt buộc kiểm tra
                  </label>
                </div>
                <Button type="submit" disabled={!canStart || mutations.startSession.isPending}>
                  <PackagePlus className="size-4" aria-hidden="true" />
                  Bắt đầu phiên
                </Button>
              </form>
            </ActionPanel>
          ) : null}

          {pack ? <PackageSummary pack={pack} /> : null}

          {session ? (
            <div className="space-y-3 rounded-md border p-4 text-sm">
              <h2 className="text-base font-semibold">Trạng thái phiên</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-muted-foreground text-xs">Phiên</div>
                  <div>{session.sessionNumber}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Trạng thái</div>
                  <div>{session.status}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Kết quả kiểm tra</div>
                  <div>{session.checkResult}</div>
                </div>
              </div>
              {session.checkExceptionCaseId ? (
                <div className="text-destructive">Hồ sơ ngoại lệ: {session.checkExceptionCaseId}</div>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <ActionPanel
            title="Thao tác đóng gói"
            description="Thao tác yêu cầu lý do/bằng chứng khi chính sách yêu cầu và cần khóa idempotency."
            state={isReadOnlyPackage ? 'disabled' : mutationError ? 'error' : 'idle'}
            stateMessage={
              isReadOnlyPackage
                ? 'Kiện hàng đã sẵn sàng staging và không thể đổi từ khu vực thao tác này.'
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
              <label className="grid gap-1 text-sm">
                Kết quả kiểm tra
                <select
                  className="rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={checkResult}
                  onChange={(event) => setCheckResult(event.target.value as PackageCheckResult)}
                >
                  {PACKAGE_CHECK_RESULTS.map((result) => (
                    <option key={result} value={result}>
                      {result}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Số lượng quan sát
                  <Input
                    value={observedQuantity}
                    onChange={(event) => setObservedQuantity(event.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  ID SKU quan sát
                  <Input
                    value={observedSkuId}
                    onChange={(event) => setObservedSkuId(event.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Mã SKU quan sát
                <Input value={observedSkuCode} onChange={(event) => setObservedSkuCode(event.target.value)} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Loại thùng
                  <Input value={cartonType} onChange={(event) => setCartonType(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  Khối lượng
                  <Input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Dài
                  <Input value={length} onChange={(event) => setLength(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Rộng
                  <Input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Cao
                  <Input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Loại nhãn
                  <Input value={labelType} onChange={(event) => setLabelType(event.target.value)} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={attemptOverride}
                  onChange={(event) => setAttemptOverride(event.target.checked)}
                />
                Thử ghi đè
              </label>
            </div>
            {mode === 'new' ? (
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canCheck || mutations.recordCheck.isPending}
                  onClick={runCheck}
                >
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  Ghi nhận kiểm tra
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canCreate || mutations.createPackage.isPending}
                  onClick={runCreatePackage}
                >
                  <PackagePlus className="size-4" aria-hidden="true" />
                  Tạo kiện hàng
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canClose || mutations.closePackage.isPending}
                  onClick={runClosePackage}
                >
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Đóng kiện
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReady || mutations.readyForStaging.isPending}
                  onClick={runReadyForStaging}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Sẵn sàng staging
                </Button>
              </div>
            )}
            {lastReadyMessage ? (
              <p className="flex items-center gap-2 text-sm font-medium">
                <Printer className="size-4" aria-hidden="true" />
                {lastReadyMessage}
              </p>
            ) : null}
          </ActionPanel>
        </aside>
      </div>
    </DetailPageShell>
  );
}

export function PackingCreatePage() {
  return <PackingDetailPage mode="new" />;
}
