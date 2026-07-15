import type {
  InboundOperationalState,
  InboundPutawayRelease,
  ReceiptLine,
} from '@modules/Inbound/Domain/Types/InboundPlan';

export type InboundLineStage =
  | 'not-started'
  | 'gate-in'
  | 'receiving'
  | 'qc'
  | 'lpn'
  | 'released'
  | 'released-partial';

/**
 * IFB-21: a plan line can have more than one receipt line (multi-unit
 * SerialControlled receiving forces one receiving-confirm call per physical
 * unit — see IFB-14), so a single matching release record never means the
 * plan line itself is fully received. Every receipt line for the same plan
 * line carries the same `expectedQuantity` (denormalized from the plan line
 * at confirm time), so summing `actualQuantity` across just the ones for
 * this `lineId` and comparing to any one of their `expectedQuantity` is
 * enough — no extra plan-line lookup needed.
 *
 * Review fix: also scope by `skuId`, matching the BE guard's precedent — a
 * substituted-SKU receipt line sharing this `lineId` must not contaminate
 * the correct SKU's cumulative count.
 */
export function isPlanLineFullyReceived(
  receiptLines: Pick<ReceiptLine, 'inboundPlanLineId' | 'actualQuantity' | 'expectedQuantity' | 'skuId'>[],
  lineId: string,
  skuId: string,
): boolean {
  const linesForPlanLine = receiptLines.filter(
    (line) => line.inboundPlanLineId === lineId && line.skuId === skuId,
  );
  if (linesForPlanLine.length === 0) return false;
  const cumulativeActualQuantity = linesForPlanLine.reduce((sum, line) => sum + line.actualQuantity, 0);
  return cumulativeActualQuantity >= linesForPlanLine[0].expectedQuantity;
}

/**
 * IFB-22: mirrors `isPlanLineFullyReceived`, but for the RELEASE axis.
 * Release is per-unit too (`ReleaseInboundToPutawayUseCase` operates on
 * exactly one `ReceiptLineId`), so a SerialControlled plan line with N
 * received units needs N release records before it is truly done.
 * `InboundPutawayRelease` carries no `expectedQuantity` of its own —
 * callers pass the SAME value already derived from `receiptLines` for
 * `isPlanLineFullyReceived`, so both helpers agree on one source of truth.
 * SkuId-scoped for the same reason as the receive-axis helper: a
 * substituted-SKU release sharing this `lineId` must not count toward the
 * correct SKU's cumulative released quantity.
 *
 * Review fix: `expectedQuantity <= 0` means the caller had no matching
 * receipt line to derive it from -- treat that as "not fully released"
 * rather than trivially true, so an orphan release record can't report a
 * plan line as done.
 */
export function isPlanLineFullyReleased(
  releases: Pick<InboundPutawayRelease, 'inboundPlanLineId' | 'skuId' | 'quantity'>[],
  lineId: string,
  skuId: string,
  expectedQuantity: number,
): boolean {
  if (expectedQuantity <= 0) return false;
  const releasesForPlanLine = releases.filter(
    (release) => release.inboundPlanLineId === lineId && release.skuId === skuId,
  );
  if (releasesForPlanLine.length === 0) return false;
  const cumulativeReleasedQuantity = releasesForPlanLine.reduce((sum, release) => sum + release.quantity, 0);
  return cumulativeReleasedQuantity >= expectedQuantity;
}

/**
 * Derives the stage chip value for the focused line from the page's existing
 * per-line done/skip flags. Mirrors the workflow precedence (released > lpn >
 * qc-done > receiving > gate-in) so the chip never diverges from the ribbon.
 * `releaseDone` alone only means "at least one release exists for this
 * line" — `fullyReceived` (IFB-21) and `fullyReleased` (IFB-22) distinguish a
 * real completed line from one released after only a partial quantity was
 * ever received OR only partially released so far. `'released-partial'`
 * covers BOTH axes (not yet fully received, or received but not yet fully
 * released) — one state, broadened semantics, no new union member.
 */
export function deriveFocusedLineStage(flags: {
  gateInDone: boolean;
  receivingDone: boolean;
  qcDone: boolean;
  lpnDone: boolean;
  releaseDone: boolean;
  fullyReceived: boolean;
  fullyReleased: boolean;
}): InboundLineStage {
  if (flags.releaseDone) return flags.fullyReceived && flags.fullyReleased ? 'released' : 'released-partial';
  if (flags.lpnDone) return 'lpn';
  if (flags.qcDone) return 'qc';
  if (flags.receivingDone) return 'receiving';
  if (flags.gateInDone) return 'gate-in';
  return 'not-started';
}

/**
 * Derives the stage chip value for ANY plan line (not just the focused one)
 * straight from the persisted operational-state read model, which already
 * carries `inboundPlanLineId` on every row (receipt lines, QC tasks/results,
 * LPNs, releases) — no need to resolve through a "confirmed receipt line"
 * first. Used by the line rail so every row shows its own real progress
 * instead of defaulting to `not-started` for whichever line isn't focused.
 */
export function deriveLineStage(params: {
  lineId: string;
  skuId: string;
  gateInDone: boolean;
  operationalState: Pick<
    InboundOperationalState,
    'receiptLines' | 'qcTasks' | 'qcResults' | 'lpns' | 'releases'
  > | null;
}): InboundLineStage {
  const { lineId, skuId, gateInDone, operationalState } = params;
  const receivingDone = Boolean(
    operationalState?.receiptLines.some((line) => line.inboundPlanLineId === lineId),
  );
  const latestQcTask = [...(operationalState?.qcTasks ?? [])]
    .filter((task) => task.inboundPlanLineId === lineId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const qcSkipped = Boolean(latestQcTask && !latestQcTask.required);
  const qcResultDone = Boolean(
    operationalState?.qcResults.some((result) => result.inboundPlanLineId === lineId),
  );
  const lpnDone = Boolean(operationalState?.lpns.some((lpn) => lpn.inboundPlanLineId === lineId));
  const releaseDone = Boolean(
    operationalState?.releases.some((release) => release.inboundPlanLineId === lineId),
  );
  const linesForPlanLine = (operationalState?.receiptLines ?? []).filter(
    (line) => line.inboundPlanLineId === lineId && line.skuId === skuId,
  );
  const expectedQuantity = linesForPlanLine[0]?.expectedQuantity ?? 0;
  const fullyReceived = isPlanLineFullyReceived(operationalState?.receiptLines ?? [], lineId, skuId);
  const fullyReleased = isPlanLineFullyReleased(
    operationalState?.releases ?? [],
    lineId,
    skuId,
    expectedQuantity,
  );
  return deriveFocusedLineStage({
    gateInDone,
    receivingDone,
    qcDone: qcResultDone || qcSkipped,
    lpnDone,
    releaseDone,
    fullyReceived,
    fullyReleased,
  });
}
