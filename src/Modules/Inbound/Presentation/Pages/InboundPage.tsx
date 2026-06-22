import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Loader2, PlayCircle, RefreshCw, ScanLine } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { cn } from '@shared/Utils/Cn';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import {
  useInboundPlans,
  useReceivingReadiness,
} from '@modules/Inbound/Application/Queries/UseInboundPlans';
import { INBOUND_DISCREPANCY_TYPES } from '@modules/Inbound/Domain/Constants/InboundConstants';
import type {
  InboundDiscrepancyType,
  InboundPlan,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface DraftLine {
  id: number;
  skuId: string;
  uomId: string;
  expectedQuantity: string;
  externalLineReference: string;
}

let nextDraftLineId = 0;

const initialLine = (): DraftLine => ({
  id: (nextDraftLineId += 1),
  skuId: '',
  uomId: '',
  expectedQuantity: '1',
  externalLineReference: '',
});

function StatusBadge({ value }: { value: string }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{value}</span>;
}

function PlanButton({
  plan,
  active,
  onSelect,
}: {
  plan: InboundPlan;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={plan.sourceDocumentNumber}
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border p-4 text-left transition-colors',
        active ? 'border-primary bg-primary/5' : 'hover:bg-muted/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{plan.sourceDocumentNumber}</div>
          <div className="text-muted-foreground text-sm">
            {plan.sourceSystem} - {plan.sourceDocumentType}
          </div>
        </div>
        <StatusBadge value={plan.status} />
      </div>
      <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
        <span>{plan.warehouseCode ?? plan.warehouseId}</span>
        <span>{plan.ownerCode ?? plan.ownerId}</span>
        <span>{plan.gateInStatus}</span>
      </div>
    </button>
  );
}

export function InboundPage() {
  const [page] = useState(1);
  const [sourceSystemFilter, setSourceSystemFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceSystem, setSourceSystem] = useState('');
  const [sourceDocumentType, setSourceDocumentType] = useState('ASN');
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('');
  const [lineDrafts, setLineDrafts] = useState<DraftLine[]>(() => [initialLine()]);
  const [gateReference, setGateReference] = useState('');
  const [readinessReasonCode, setReadinessReasonCode] = useState('');
  const [readinessOverridePlanId, setReadinessOverridePlanId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [receivingSessionKey, setReceivingSessionKey] = useState('dock-1');
  const [receivingDeviceCode, setReceivingDeviceCode] = useState('rf-web');
  const [receiptActualQuantity, setReceiptActualQuantity] = useState('1');
  const [receiptRawScan, setReceiptRawScan] = useState('');
  const [receiptManualConfirm, setReceiptManualConfirm] = useState(false);
  const [receiptReasonCode, setReceiptReasonCode] = useState('');
  const [receiptIdempotencyKey, setReceiptIdempotencyKey] = useState(() => `receipt-${Date.now()}`);
  const [discrepancyType, setDiscrepancyType] =
    useState<InboundDiscrepancyType>('QuantityVariance');
  const [discrepancyReasonCode, setDiscrepancyReasonCode] = useState('');
  const [discrepancyReasonNote, setDiscrepancyReasonNote] = useState('');
  const [discrepancyEvidenceRefs, setDiscrepancyEvidenceRefs] = useState('');
  const [discrepancyIdempotencyKey, setDiscrepancyIdempotencyKey] = useState(
    () => `discrepancy-${Date.now()}`,
  );

  const debouncedSourceSystem = useDebouncedValue(sourceSystemFilter, 250);
  const debouncedDocument = useDebouncedValue(documentFilter, 250);
  const query = useInboundPlans({
    page,
    sourceSystem: debouncedSourceSystem || undefined,
    sourceDocumentNumber: debouncedDocument || undefined,
  });
  const mutations = useInboundMutations();
  const resetValidateReadiness = mutations.validateReadiness.reset;
  const resetStartReceiving = mutations.startReceivingSession.reset;
  const resetConfirmReceiptLine = mutations.confirmReceiptLine.reset;
  const resetCaptureDiscrepancy = mutations.captureDiscrepancy.reset;

  const plans = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const selected = useMemo(
    () =>
      (mutations.recordGateIn.data?.id === selectedId ? mutations.recordGateIn.data : null) ??
      (mutations.createInboundPlan.data?.id === selectedId
        ? mutations.createInboundPlan.data
        : null) ??
      plans.find((plan) => plan.id === selectedId) ??
      plans[0] ??
      null,
    [mutations.createInboundPlan.data, mutations.recordGateIn.data, plans, selectedId],
  );
  const receivingSession =
    mutations.startReceivingSession.data?.inboundPlanId === selected?.id
      ? mutations.startReceivingSession.data
      : null;
  const selectedLine = useMemo(
    () => selected?.lines.find((line) => line.id === selectedLineId) ?? selected?.lines[0] ?? null,
    [selected?.lines, selectedLineId],
  );
  const lastConfirmedLine = mutations.confirmReceiptLine.data;
  const confirmedReceiptLine =
    lastConfirmedLine &&
    lastConfirmedLine.inboundPlanId === selected?.id &&
    lastConfirmedLine.inboundPlanLineId === selectedLine?.id
      ? lastConfirmedLine
      : null;
  const selectedInitialLineId = selected?.lines[0]?.id ?? null;
  const selectedInitialExpectedQuantity = selected?.lines[0]?.expectedQuantity ?? 1;
  const readinessQuery = useReceivingReadiness(selected?.id ?? null);
  const readiness =
    readinessOverridePlanId === selected?.id
      ? (mutations.validateReadiness.data ?? readinessQuery.data ?? null)
      : (readinessQuery.data ?? null);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const denied = Boolean(apiError?.isForbidden);
  const canCreate = Boolean(
    sourceSystem.trim() &&
    sourceDocumentNumber.trim() &&
    supplierId.trim() &&
    ownerId.trim() &&
    warehouseId.trim() &&
    lineDrafts.every(
      (line) => line.skuId.trim() && line.uomId.trim() && Number(line.expectedQuantity) > 0,
    ),
  );
  const canGateIn = Boolean(selected && gateReference.trim());
  const canOverride = Boolean(selected && readinessReasonCode.trim());
  const canStartReceiving = Boolean(selected && receivingSessionKey.trim());
  const canConfirmReceiptLine = Boolean(
    receivingSession &&
    selectedLine &&
    Number(receiptActualQuantity) > 0 &&
    receiptIdempotencyKey.trim() &&
    (receiptManualConfirm ? receiptReasonCode.trim() : true),
  );
  const discrepancyEvidenceRefList = useMemo(
    () =>
      discrepancyEvidenceRefs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [discrepancyEvidenceRefs],
  );
  const canCaptureDiscrepancy = Boolean(
    receivingSession &&
    confirmedReceiptLine &&
    discrepancyReasonCode.trim() &&
    discrepancyEvidenceRefList.length > 0 &&
    discrepancyIdempotencyKey.trim(),
  );

  useEffect(() => {
    if (!selectedId && plans[0]) setSelectedId(plans[0].id);
    if (selectedId && plans.length > 0 && !plans.some((plan) => plan.id === selectedId)) {
      setSelectedId(plans[0].id);
    }
  }, [plans, selectedId]);

  useEffect(() => {
    setGateReference('');
    setReadinessReasonCode('');
    setReadinessOverridePlanId(null);
    setSelectedLineId(selectedInitialLineId);
    setReceiptActualQuantity(String(selectedInitialExpectedQuantity));
    setReceiptRawScan('');
    setReceiptManualConfirm(false);
    setReceiptReasonCode('');
    setReceiptIdempotencyKey(`receipt-${selected?.id ?? 'none'}-${Date.now()}`);
    setDiscrepancyType('QuantityVariance');
    setDiscrepancyReasonCode('');
    setDiscrepancyReasonNote('');
    setDiscrepancyEvidenceRefs('');
    setDiscrepancyIdempotencyKey(`discrepancy-${selected?.id ?? 'none'}-${Date.now()}`);
    resetValidateReadiness();
    resetStartReceiving();
    resetConfirmReceiptLine();
    resetCaptureDiscrepancy();
  }, [
    resetCaptureDiscrepancy,
    resetConfirmReceiptLine,
    resetStartReceiving,
    resetValidateReadiness,
    selected?.id,
    selectedInitialExpectedQuantity,
    selectedInitialLineId,
  ]);

  function updateLine(id: number, patch: Partial<DraftLine>) {
    setLineDrafts((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    mutations.createInboundPlan.mutate(
      {
        sourceSystem: sourceSystem.trim(),
        sourceDocumentType: sourceDocumentType.trim() || 'ASN',
        sourceDocumentNumber: sourceDocumentNumber.trim(),
        supplierId: supplierId.trim(),
        ownerId: ownerId.trim(),
        warehouseId: warehouseId.trim(),
        warehouseProfileId: warehouseProfileId.trim() || null,
        expectedArrivalAt: expectedArrivalAt ? new Date(expectedArrivalAt).toISOString() : null,
        lines: lineDrafts.map((line, index) => ({
          lineNumber: index + 1,
          skuId: line.skuId.trim(),
          uomId: line.uomId.trim(),
          expectedQuantity: Number(line.expectedQuantity),
          externalLineReference: line.externalLineReference.trim() || null,
        })),
      },
      {
        onSuccess: (plan) => {
          setSelectedId(plan.id);
          setSourceDocumentNumber('');
          setExpectedArrivalAt('');
          setLineDrafts([initialLine()]);
        },
      },
    );
  }

  function submitGateIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canGateIn) return;
    mutations.recordGateIn.mutate(
      {
        id: selected.id,
        input: {
          gateInAt: new Date().toISOString(),
          gateReference: gateReference.trim(),
        },
      },
      {
        onSuccess: (plan) => {
          setSelectedId(plan.id);
          setGateReference('');
          setReadinessOverridePlanId(null);
          mutations.validateReadiness.reset();
        },
      },
    );
  }

  function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canOverride) return;
    mutations.validateReadiness.mutate(
      {
        id: selected.id,
        input: { attemptOverride: true, reasonCode: readinessReasonCode.trim() },
      },
      { onSuccess: () => setReadinessOverridePlanId(selected.id) },
    );
  }

  function submitStartReceiving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canStartReceiving) return;
    mutations.startReceivingSession.mutate({
      id: selected.id,
      input: {
        sessionKey: receivingSessionKey.trim(),
        deviceCode: receivingDeviceCode.trim() || null,
      },
    });
  }

  function submitReceiptLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !selectedLine || !canConfirmReceiptLine) return;
    mutations.confirmReceiptLine.mutate(
      {
        receiptId: receivingSession.receiptId,
        input: {
          inboundPlanLineId: selectedLine.id,
          actualQuantity: Number(receiptActualQuantity),
          manualConfirm: receiptManualConfirm,
          reasonCode: receiptManualConfirm ? receiptReasonCode.trim() : null,
          idempotencyKey: receiptIdempotencyKey.trim(),
          scanEvidence: receiptManualConfirm
            ? null
            : {
                rawValue: receiptRawScan.trim(),
                scanResult: 'Accepted',
                resolvedSkuId: selectedLine.skuId,
                resolvedUomId: selectedLine.uomId,
              },
        },
      },
      {
        onSuccess: (line) => {
          setReceiptRawScan('');
          setReceiptReasonCode('');
          setReceiptIdempotencyKey(`receipt-${selectedLine.id}-${Date.now()}`);
          setDiscrepancyType(line.discrepancySignals[0] ?? 'QuantityVariance');
        },
      },
    );
  }

  function submitDiscrepancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !confirmedReceiptLine || !canCaptureDiscrepancy) return;
    mutations.captureDiscrepancy.mutate(
      {
        receiptId: receivingSession.receiptId,
        input: {
          receiptLineId: confirmedReceiptLine.id,
          discrepancyType,
          reasonCode: discrepancyReasonCode.trim(),
          reasonNote: discrepancyReasonNote.trim() || null,
          evidenceRefs: discrepancyEvidenceRefList,
          idempotencyKey: discrepancyIdempotencyKey.trim(),
        },
      },
      {
        onSuccess: () => {
          setDiscrepancyReasonNote('');
          setDiscrepancyEvidenceRefs('');
          setDiscrepancyIdempotencyKey(`discrepancy-${confirmedReceiptLine.id}-${Date.now()}`);
        },
      },
    );
  }

  if (denied) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbound plans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Permission denied for inbound plan read.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-4">
        <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Source system filter
            <Input
              value={sourceSystemFilter}
              onChange={(event) => setSourceSystemFilter(event.target.value)}
              placeholder="ERP"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Document number filter
            <Input
              value={documentFilter}
              onChange={(event) => setDocumentFilter(event.target.value)}
              placeholder="ASN-10001"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {query.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading inbound plans
            </div>
          ) : query.error ? (
            <div className="text-destructive text-sm">Unable to load inbound plans.</div>
          ) : plans.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No inbound plans match the current filters.
            </div>
          ) : (
            plans.map((plan) => (
              <PlanButton
                key={plan.id}
                plan={plan}
                active={plan.id === selected?.id}
                onSelect={() => setSelectedId(plan.id)}
              />
            ))
          )}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inbound source detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={selected.status} />
                <StatusBadge value={selected.gateInStatus} />
                <span className="text-muted-foreground text-sm">{selected.businessReference}</span>
              </div>
              <div className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
                <span>ETA: {selected.expectedArrivalAt ?? 'Not set'}</span>
                <span>CoreFlow trace: {selected.coreFlowInstanceId ?? 'Not linked'}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Line</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2">UOM</th>
                      <th className="py-2 text-right">Expected</th>
                      <th className="py-2 text-right">External ref</th>
                      <th className="py-2 text-right">Receive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="py-2">{line.lineNumber}</td>
                        <td className="py-2">{line.skuCode ?? line.skuId}</td>
                        <td className="py-2">{line.uomCode ?? line.uomId}</td>
                        <td className="py-2 text-right">{line.expectedQuantity}</td>
                        <td className="py-2 text-right">{line.externalLineReference ?? '-'}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            className={cn(
                              'rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted',
                              selectedLine?.id === line.id && 'border-primary bg-primary/5',
                            )}
                            onClick={() => {
                              setSelectedLineId(line.id);
                              setReceiptActualQuantity(String(line.expectedQuantity));
                            }}
                          >
                            Use line {line.lineNumber}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {readinessQuery.isLoading ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Checking readiness
                </p>
              ) : readiness ? (
                <p
                  className={cn(
                    'text-sm',
                    readiness.allowed ? 'text-emerald-700' : 'text-muted-foreground',
                  )}
                >
                  {readiness.overrideAccepted ? 'Override accepted' : readiness.reason}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create source document</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCreate}>
              <label className="grid gap-1 text-sm">
                Source system
                <Input
                  value={sourceSystem}
                  onChange={(event) => setSourceSystem(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Source document type
                <Input
                  value={sourceDocumentType}
                  onChange={(event) => setSourceDocumentType(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Source document number
                <Input
                  value={sourceDocumentNumber}
                  onChange={(event) => setSourceDocumentNumber(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Supplier id
                <Input value={supplierId} onChange={(event) => setSupplierId(event.target.value)} />
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
                Warehouse profile id
                <Input
                  value={warehouseProfileId}
                  onChange={(event) => setWarehouseProfileId(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Expected arrival
                <Input
                  type="datetime-local"
                  value={expectedArrivalAt}
                  onChange={(event) => setExpectedArrivalAt(event.target.value)}
                />
              </label>
              <div className="space-y-3">
                {lineDrafts.map((line, index) => (
                  <div key={line.id} className="grid gap-3 border-t pt-3 sm:grid-cols-4">
                    <label className="grid gap-1 text-sm">
                      SKU id
                      <Input
                        value={line.skuId}
                        onChange={(event) => updateLine(line.id, { skuId: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      UOM id
                      <Input
                        value={line.uomId}
                        onChange={(event) => updateLine(line.id, { uomId: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Expected quantity
                      <Input
                        type="number"
                        min="1"
                        value={line.expectedQuantity}
                        onChange={(event) =>
                          updateLine(line.id, { expectedQuantity: event.target.value })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      External line reference
                      <Input
                        value={line.externalLineReference}
                        onChange={(event) =>
                          updateLine(line.id, { externalLineReference: event.target.value })
                        }
                      />
                    </label>
                    {lineDrafts.length > 1 && (
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted sm:col-span-4"
                        onClick={() =>
                          setLineDrafts((lines) => lines.filter((draft) => draft.id !== line.id))
                        }
                      >
                        Remove line {index + 1}
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  onClick={() => setLineDrafts((lines) => [...lines, initialLine()])}
                >
                  Add line
                </button>
              </div>
              <button
                type="submit"
                className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canCreate || mutations.createInboundPlan.isPending}
              >
                Create inbound plan
              </button>
              {mutations.createInboundPlan.isPending && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <RefreshCw className="size-4 animate-spin" />
                  Creating source document
                </p>
              )}
              {mutations.createInboundPlan.data?.isDuplicate && (
                <p className="text-muted-foreground text-sm">Existing inbound plan reused.</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gate-in and readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={submitGateIn}>
              <label className="grid gap-1 text-sm">
                Gate reference
                <Input
                  value={gateReference}
                  onChange={(event) => setGateReference(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canGateIn || mutations.recordGateIn.isPending}
              >
                Record gate-in
              </button>
            </form>

            <form className="space-y-3" onSubmit={submitOverride}>
              <label className="grid gap-1 text-sm">
                Readiness reason code
                <Input
                  value={readinessReasonCode}
                  onChange={(event) => setReadinessReasonCode(event.target.value)}
                  placeholder="RC-V1-HANDOFF"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canOverride || mutations.validateReadiness.isPending}
              >
                Override readiness
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receiving scan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={submitStartReceiving}>
              <label className="grid gap-1 text-sm">
                Receiving session key
                <Input
                  value={receivingSessionKey}
                  onChange={(event) => setReceivingSessionKey(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Device code
                <Input
                  value={receivingDeviceCode}
                  onChange={(event) => setReceivingDeviceCode(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canStartReceiving || mutations.startReceivingSession.isPending}
              >
                <PlayCircle className="size-4" />
                Start receiving
              </button>
              {receivingSession && (
                <p className="text-muted-foreground text-sm">
                  Receipt {receivingSession.receiptNumber}
                  {receivingSession.isDuplicate ? ' reused' : ' ready'}.
                </p>
              )}
            </form>

            <form className="space-y-3" onSubmit={submitReceiptLine}>
              <div className="text-muted-foreground text-sm">
                Selected line:{' '}
                {selectedLine
                  ? `${selectedLine.lineNumber} - ${selectedLine.skuCode ?? selectedLine.skuId}`
                  : 'None'}
              </div>
              <label className="grid gap-1 text-sm">
                Actual quantity
                <Input
                  type="number"
                  min="0.0001"
                  value={receiptActualQuantity}
                  onChange={(event) => setReceiptActualQuantity(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Raw scan value
                <Input
                  value={receiptRawScan}
                  onChange={(event) => setReceiptRawScan(event.target.value)}
                  disabled={receiptManualConfirm}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={receiptManualConfirm}
                  onChange={(event) => setReceiptManualConfirm(event.target.checked)}
                />
                Manual confirm
              </label>
              <label className="grid gap-1 text-sm">
                Receipt reason code
                <Input
                  value={receiptReasonCode}
                  onChange={(event) => setReceiptReasonCode(event.target.value)}
                  disabled={!receiptManualConfirm}
                  placeholder="RC-V1-MANUAL-SCAN"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Idempotency key
                <Input
                  value={receiptIdempotencyKey}
                  onChange={(event) => setReceiptIdempotencyKey(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canConfirmReceiptLine || mutations.confirmReceiptLine.isPending}
              >
                <ScanLine className="size-4" />
                Confirm receipt line
              </button>
              {mutations.confirmReceiptLine.data && (
                <p className="text-muted-foreground text-sm">
                  Line {mutations.confirmReceiptLine.data.lineNumber}{' '}
                  {mutations.confirmReceiptLine.data.status}
                  {mutations.confirmReceiptLine.data.isDuplicate ? ' duplicate reused' : ''}
                  {mutations.confirmReceiptLine.data.discrepancySignals.length
                    ? ` - ${mutations.confirmReceiptLine.data.discrepancySignals.join(', ')}`
                    : ''}
                </p>
              )}
            </form>

            {confirmedReceiptLine && (
              <form className="space-y-3 rounded-md border p-3" onSubmit={submitDiscrepancy}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="size-4" />
                  Discrepancy routing
                </div>
                {confirmedReceiptLine.discrepancySignals.length > 0 && (
                  <div className="text-muted-foreground text-xs">
                    Signals: {confirmedReceiptLine.discrepancySignals.join(', ')}
                  </div>
                )}
                <label className="grid gap-1 text-sm">
                  Discrepancy type
                  <select
                    value={discrepancyType}
                    onChange={(event) =>
                      setDiscrepancyType(event.target.value as InboundDiscrepancyType)
                    }
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {INBOUND_DISCREPANCY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Discrepancy reason code
                  <Input
                    value={discrepancyReasonCode}
                    onChange={(event) => setDiscrepancyReasonCode(event.target.value)}
                    placeholder="RC-V1-DISCREPANCY"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Discrepancy reason note
                  <Input
                    value={discrepancyReasonNote}
                    onChange={(event) => setDiscrepancyReasonNote(event.target.value)}
                    placeholder="Quantity differs from ASN"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Discrepancy evidence refs
                  <Input
                    value={discrepancyEvidenceRefs}
                    onChange={(event) => setDiscrepancyEvidenceRefs(event.target.value)}
                    placeholder="photo://dock/over-qty-1"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Discrepancy idempotency key
                  <Input
                    value={discrepancyIdempotencyKey}
                    onChange={(event) => setDiscrepancyIdempotencyKey(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canCaptureDiscrepancy || mutations.captureDiscrepancy.isPending}
                >
                  <AlertTriangle className="size-4" />
                  Route discrepancy
                </button>
                {mutations.captureDiscrepancy.data && (
                  <p className="text-muted-foreground text-sm">
                    Discrepancy {mutations.captureDiscrepancy.data.status} / Exception{' '}
                    {mutations.captureDiscrepancy.data.exceptionCaseId}
                    {mutations.captureDiscrepancy.data.status === 'PendingApproval'
                      ? ' / approval required'
                      : ''}
                  </p>
                )}
                {mutations.captureDiscrepancy.error ? (
                  <p className="text-destructive text-sm">Unable to route discrepancy.</p>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
