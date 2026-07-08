import type { InboundOperationalState } from '@modules/Inbound/Domain/Types/InboundPlan';

export type InboundLineStage =
  | 'not-started'
  | 'gate-in'
  | 'receiving'
  | 'qc'
  | 'lpn'
  | 'released';

/**
 * Derives the stage chip value for the focused line from the page's existing
 * per-line done/skip flags. Mirrors the workflow precedence (released > lpn >
 * qc-done > receiving > gate-in) so the chip never diverges from the ribbon.
 */
export function deriveFocusedLineStage(flags: {
  gateInDone: boolean;
  receivingDone: boolean;
  qcDone: boolean;
  lpnDone: boolean;
  releaseDone: boolean;
}): InboundLineStage {
  if (flags.releaseDone) return 'released';
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
  gateInDone: boolean;
  operationalState: Pick<
    InboundOperationalState,
    'receiptLines' | 'qcTasks' | 'qcResults' | 'lpns' | 'releases'
  > | null;
}): InboundLineStage {
  const { lineId, gateInDone, operationalState } = params;
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
  return deriveFocusedLineStage({
    gateInDone,
    receivingDone,
    qcDone: qcResultDone || qcSkipped,
    lpnDone,
    releaseDone,
  });
}
