import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, PackageCheck, PackagePlus, Printer } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
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
  return 'Unable to complete packing action.';
}

function StatusBadge({ status }: { status: PackageStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function SessionBadge({ session }: { session: PackSession }) {
  return (
    <span className="rounded-md border px-2 py-1 text-xs font-medium">
      {session.status} / {session.checkResult}
    </span>
  );
}

function PackageSummary({ pack }: { pack: Package }) {
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      <h2 className="text-base font-semibold">Package content</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground text-xs">Pack session</div>
          <div>{pack.packSessionId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Pick task</div>
          <div>{pack.pickTaskId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Outbound order</div>
          <div>{pack.outboundOrderId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Carton</div>
          <div>{pack.cartonType}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Weight</div>
          <div>{pack.weight ?? 'n/a'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Dimensions</div>
          <div>
            {[pack.length, pack.width, pack.height].every((item) => typeof item === 'number')
              ? `${pack.length} x ${pack.width} x ${pack.height}`
              : 'n/a'}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {pack.contents.map((content) => (
          <div key={content.id} className="grid gap-1 rounded-md border p-3 sm:grid-cols-5">
            <span>{content.skuCode ?? content.skuId}</span>
            <span>Qty {content.quantity}</span>
            <span>{content.uomCode ?? content.uomId}</span>
            <span>{content.inventoryStatusCode ?? 'No inventory status'}</span>
            <span>{content.lotNumber ?? content.serialNumber ?? content.expiryDate ?? 'No lot data'}</span>
          </div>
        ))}
      </div>
      {pack.labelBlockingDecision ? (
        <div className="rounded-md border p-3">
          <div className="font-medium">Label gate</div>
          <div className="text-muted-foreground">
            {pack.labelBlockingDecision} | {pack.labelPrintJobCode ?? pack.labelPrintJobId ?? 'No print job'}
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
              ? `Label gate blocked: ${result.labelValidation.reason}`
              : result.isDuplicate
                ? 'Ready for staging already posted'
                : 'Ready for staging posted',
          );
        },
      },
    );
  };

  return (
    <DetailPageShell
      title={mode === 'new' ? 'New package workflow' : (pack?.packageCode ?? 'Package detail')}
      subtitle="Checking, packing, label gate and ready-for-staging actions"
      backTo={ROUTES.PACKING.ROOT}
      backLabel="Back to packages"
      status={pack ? <StatusBadge status={pack.status} /> : session ? <SessionBadge session={session} /> : null}
      summary={
        pack ? (
          <>
            <span>{pack.warehouseCode ?? pack.warehouseId ?? 'warehouse unresolved'}</span>
            <span>{pack.ownerCode ?? pack.ownerId ?? 'owner unresolved'}</span>
            <span>{pack.checkRequired ? `Check ${pack.checkResult}` : 'Check not required'}</span>
          </>
        ) : session ? (
          <>
            <span>{session.sessionNumber}</span>
            <span>{session.pickTaskId}</span>
            <span>{session.checkRequired ? `Check ${session.checkResult}` : 'Check not required'}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        apiError?.isForbidden
          ? 'Permission denied'
          : isBlockedPackage
            ? 'Package blocked'
            : isReadOnlyPackage
              ? 'Package read-only'
          : packageQuery.error
            ? 'Unable to load package'
            : undefined
      }
      stateMessage={
        apiError?.isForbidden
          ? 'Permission denied for package detail.'
          : isBlockedPackage
            ? 'Resolve the blocking condition before changing this package.'
            : isReadOnlyPackage
              ? 'This package is already ready for staging; mutation actions are disabled.'
          : packageQuery.error
            ? (errorMessage(packageQuery.error) ?? 'The package could not be loaded.')
            : 'The requested package was not found.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {mode === 'new' ? (
            <ActionPanel
              title="Start pack session"
              description="Creates the package work session from a completed pick task."
              state={mutations.startSession.isPending ? 'pending' : 'idle'}
            >
              <form className="space-y-3" onSubmit={handleStartSession}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Pick task id
                    <Input value={pickTaskId} onChange={(event) => setPickTaskId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Mobile task id
                    <Input
                      value={mobileTaskId}
                      onChange={(event) => setMobileTaskId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Warehouse profile id
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
                    Force checking
                  </label>
                </div>
                <Button type="submit" disabled={!canStart || mutations.startSession.isPending}>
                  <PackagePlus className="size-4" aria-hidden="true" />
                  Start session
                </Button>
              </form>
            </ActionPanel>
          ) : null}

          {pack ? <PackageSummary pack={pack} /> : null}

          {session ? (
            <div className="space-y-3 rounded-md border p-4 text-sm">
              <h2 className="text-base font-semibold">Session state</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-muted-foreground text-xs">Session</div>
                  <div>{session.sessionNumber}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Status</div>
                  <div>{session.status}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Check result</div>
                  <div>{session.checkResult}</div>
                </div>
              </div>
              {session.checkExceptionCaseId ? (
                <div className="text-destructive">Exception case: {session.checkExceptionCaseId}</div>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <ActionPanel
            title="Packing actions"
            description="Actions require reason/evidence when policy requires it and an idempotency key."
            state={isReadOnlyPackage ? 'disabled' : mutationError ? 'error' : 'idle'}
            stateMessage={
              isReadOnlyPackage
                ? 'Package is ready for staging and cannot be changed from this action surface.'
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
                <Input
                  value={idempotencyKey}
                  onChange={(event) => setIdempotencyKey(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Check result
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
                  Observed quantity
                  <Input
                    value={observedQuantity}
                    onChange={(event) => setObservedQuantity(event.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Observed SKU id
                  <Input
                    value={observedSkuId}
                    onChange={(event) => setObservedSkuId(event.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Observed SKU code
                <Input value={observedSkuCode} onChange={(event) => setObservedSkuCode(event.target.value)} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Carton type
                  <Input value={cartonType} onChange={(event) => setCartonType(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  Weight
                  <Input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Length
                  <Input value={length} onChange={(event) => setLength(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Width
                  <Input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Height
                  <Input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" />
                </label>
                <label className="grid gap-1 text-sm">
                  Label type
                  <Input value={labelType} onChange={(event) => setLabelType(event.target.value)} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={attemptOverride}
                  onChange={(event) => setAttemptOverride(event.target.checked)}
                />
                Attempt override
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
                  Record check
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canCreate || mutations.createPackage.isPending}
                  onClick={runCreatePackage}
                >
                  <PackagePlus className="size-4" aria-hidden="true" />
                  Create package
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
                  Close package
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canReady || mutations.readyForStaging.isPending}
                  onClick={runReadyForStaging}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Ready for staging
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
