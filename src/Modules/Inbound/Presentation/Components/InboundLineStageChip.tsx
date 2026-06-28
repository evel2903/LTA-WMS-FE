import { cn } from '@shared/Utils/Cn';
import type { InboundLineStage } from '@modules/Inbound/Presentation/Components/InboundLineStage';

const stageLabels: Record<InboundLineStage, string> = {
  'not-started': 'Chưa bắt đầu',
  'gate-in': 'Đã vào cổng',
  receiving: 'Đã tiếp nhận',
  qc: 'Đã QC',
  lpn: 'Đã gán LPN',
  released: 'Đã release',
};

const stageClasses: Record<InboundLineStage, string> = {
  'not-started': 'bg-background text-muted-foreground',
  'gate-in': 'border-amber-200 bg-amber-50 text-amber-950',
  receiving: 'border-sky-200 bg-sky-50 text-sky-950',
  qc: 'border-indigo-200 bg-indigo-50 text-indigo-950',
  lpn: 'border-violet-200 bg-violet-50 text-violet-950',
  released: 'border-emerald-200 bg-emerald-50 text-emerald-950',
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
    <span
      data-testid={`inbound-line-stage-chip-${lineId}`}
      className={cn(
        'inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium',
        stageClasses[stage],
      )}
    >
      {stageLabels[stage]}
    </span>
  );
}
