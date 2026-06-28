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
