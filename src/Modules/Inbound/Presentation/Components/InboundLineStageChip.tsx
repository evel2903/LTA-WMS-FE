import { Badge, type BadgeProps } from '@shared/Components/Reui/badge';
import type { InboundLineStage } from '@modules/Inbound/Presentation/Components/InboundLineStage';

const stageLabels: Record<InboundLineStage, string> = {
  'not-started': 'Chưa bắt đầu',
  'gate-in': 'Đã vào cổng',
  receiving: 'Đã tiếp nhận',
  qc: 'Đã QC',
  lpn: 'Đã gán LPN',
  released: 'Đã release',
  // IFB-21: released, but the plan line's cumulative received quantity is
  // still below its expected quantity (SerialControlled multi-unit lines can
  // be released unit-by-unit before every unit has ever been scanned).
  'released-partial': 'Đã release một phần',
};

// Map each milestone to a ReUI semantic badge variant instead of a hand-rolled
// per-stage colour map. released -> success, gate-in -> warning, etc.
const stageVariant: Record<InboundLineStage, NonNullable<BadgeProps['variant']>> = {
  'not-started': 'secondary',
  'gate-in': 'warning-light',
  receiving: 'info-light',
  qc: 'primary-light',
  lpn: 'invert-light',
  released: 'success-light',
  'released-partial': 'warning-light',
};

/**
 * Per-line stage chip.
 *
 * For the FOCUSED line the stage is derived by the page from the existing
 * done/skip flags (see `deriveFocusedLineStage`); non-focused lines have no
 * cross-line read model, so they honestly render `Chưa bắt đầu`.
 */
export function InboundLineStageChip({
  lineId,
  stage,
}: {
  lineId: string;
  stage: InboundLineStage;
}) {
  return (
    <Badge
      variant={stageVariant[stage]}
      size="lg"
      data-testid={`inbound-line-stage-chip-${lineId}`}
    >
      {stageLabels[stage]}
    </Badge>
  );
}
