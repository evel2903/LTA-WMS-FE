import type {
  InboundOperationalState,
  InboundPutawayRelease,
  QcResult,
  ReceiptLine,
} from '@modules/Inbound/Domain/Types/InboundPlan';

export const READY_FOR_PUTAWAY = 'READY_FOR_PUTAWAY';

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
/**
 * IFB-23 review fix: reworked from a raw `expectedQuantity` comparison to
 * account for two gaps found reviewing the merged IFB-22 implementation:
 *
 * 1. A receipt line whose LATEST QcResult resolved away from
 *    READY_FOR_PUTAWAY (rejected/quarantined) can NEVER get a release row --
 *    ReleaseInboundToPutawayUseCase permanently blocks it. Comparing against
 *    the plan's full `expectedQuantity` (which still counts that unit) meant
 *    the badge could never reach "fully released" even once every unit that
 *    COULD be released had been. `releasableLines` excludes such units from
 *    both the numerator's scope and the denominator -- but ONLY while they
 *    have never been released; a line that already HAS a release row stays
 *    releasable forever, even if a LATER re-inspection moves its QC status
 *    away from READY_FOR_PUTAWAY (review-round fix: the first cut of this
 *    exclusion re-evaluated every line's current QC status unconditionally,
 *    which stripped an already-released line's own release out of both the
 *    numerator and denominator the moment it was re-inspected, permanently
 *    stranding the badge at "released-partial" -- exactly the regression
 *    Gap 5/AC6 exists to prevent).
 * 2. The numerator must be scoped to the SAME population as the denominator
 *    and deduped to one release per receipt line (latest by `releasedAt`) --
 *    BE only de-duplicates a release by (ReceiptLineId, IdempotencyKey), so a
 *    receipt line can end up with 2 release rows (a retried submission with a
 *    fresh key), and/or can be re-inspected to a worse QC status AFTER its own
 *    release. Without both the scoping and the dedupe, a stale/duplicate
 *    release row could substitute for a genuinely outstanding sibling unit
 *    that was never released.
 */
export function isPlanLineFullyReleased(
  receiptLines: Pick<ReceiptLine, 'id' | 'inboundPlanLineId' | 'actualQuantity' | 'skuId'>[],
  releases: Pick<
    InboundPutawayRelease,
    'receiptLineId' | 'inboundPlanLineId' | 'quantity' | 'skuId' | 'releasedAt'
  >[],
  qcResults: Pick<QcResult, 'receiptLineId' | 'targetInventoryStatusCode' | 'recordedAt'>[],
  lineId: string,
  skuId: string,
): boolean {
  const receiptLinesForPlanLine = receiptLines.filter(
    (line) => line.inboundPlanLineId === lineId && line.skuId === skuId,
  );
  if (receiptLinesForPlanLine.length === 0) return false;
  const releasedReceiptLineIds = new Set(
    releases
      .filter((release) => release.inboundPlanLineId === lineId && release.skuId === skuId)
      .map((release) => release.receiptLineId),
  );
  const releasableLines = receiptLinesForPlanLine.filter((line) => {
    if (releasedReceiptLineIds.has(line.id)) return true;
    const latestResult = [...qcResults]
      .filter((result) => result.receiptLineId === line.id)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    return !latestResult || latestResult.targetInventoryStatusCode === READY_FOR_PUTAWAY;
  });
  if (releasableLines.length === 0) return false;
  const releasableLineIds = new Set(releasableLines.map((line) => line.id));
  const releasesForPlanLine = releases.filter(
    (release) =>
      release.inboundPlanLineId === lineId &&
      release.skuId === skuId &&
      releasableLineIds.has(release.receiptLineId),
  );
  if (releasesForPlanLine.length === 0) return false;
  const latestReleaseByReceiptLineId = new Map<string, (typeof releasesForPlanLine)[number]>();
  for (const release of releasesForPlanLine) {
    const existing = latestReleaseByReceiptLineId.get(release.receiptLineId);
    if (!existing || release.releasedAt.localeCompare(existing.releasedAt) > 0) {
      latestReleaseByReceiptLineId.set(release.receiptLineId, release);
    }
  }
  const cumulativeReleasedQuantity = [...latestReleaseByReceiptLineId.values()].reduce(
    (sum, release) => sum + release.quantity,
    0,
  );
  const requiredQuantity = releasableLines.reduce((sum, line) => sum + line.actualQuantity, 0);
  return cumulativeReleasedQuantity >= requiredQuantity;
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
  // IFB-23 review fix: scope every existence flag by skuId too, matching
  // isPlanLineFullyReceived/isPlanLineFullyReleased's own scoping just below --
  // otherwise a substituted-SKU row sharing this inboundPlanLineId can flip
  // receivingDone/qcResultDone/lpnDone/releaseDone true even when the plan
  // line's OWN sku has zero matching activity, misrepresenting a not-yet-started
  // line as in-progress or released. QcResult carries no own skuId field, so
  // it's scoped by checking membership in this sku's own receipt-line ids.
  const receiptLineIdsForSku = new Set(
    (operationalState?.receiptLines ?? [])
      .filter((line) => line.inboundPlanLineId === lineId && line.skuId === skuId)
      .map((line) => line.id),
  );
  const receivingDone = receiptLineIdsForSku.size > 0;
  const latestQcTask = [...(operationalState?.qcTasks ?? [])]
    .filter((task) => task.inboundPlanLineId === lineId && task.skuId === skuId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const qcSkipped = Boolean(latestQcTask && !latestQcTask.required);
  const qcResultDone = Boolean(
    operationalState?.qcResults.some((result) => receiptLineIdsForSku.has(result.receiptLineId)),
  );
  const lpnDone = Boolean(
    operationalState?.lpns.some((lpn) => lpn.inboundPlanLineId === lineId && lpn.skuId === skuId),
  );
  const releaseDone = Boolean(
    operationalState?.releases.some(
      (release) => release.inboundPlanLineId === lineId && release.skuId === skuId,
    ),
  );
  const fullyReceived = isPlanLineFullyReceived(operationalState?.receiptLines ?? [], lineId, skuId);
  const fullyReleased = isPlanLineFullyReleased(
    operationalState?.receiptLines ?? [],
    operationalState?.releases ?? [],
    operationalState?.qcResults ?? [],
    lineId,
    skuId,
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
