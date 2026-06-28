import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { cn } from '@shared/Utils/Cn';
import type { InboundPlanLine } from '@modules/Inbound/Domain/Types/InboundPlan';
import type { InboundLineStage } from '@modules/Inbound/Presentation/Components/InboundLineStage';
import { InboundLineStageChip } from '@modules/Inbound/Presentation/Components/InboundLineStageChip';

function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

interface InboundLineRailProps {
  /** Stage for the currently focused line; non-focused lines render `Chưa bắt đầu`. */
  focusedLineStage: InboundLineStage;
  lines: InboundPlanLine[];
  onSelect: (line: InboundPlanLine) => void;
  registerLineButton: (lineId: string, element: HTMLButtonElement | null) => void;
  selectedLineId: string | null;
}

/**
 * The single unified line picker (replaces the desktop plan-line table AND the
 * old `InboundLineQueue`). Writes selection through one `setSelectedLineId`
 * mechanism (`onSelect`). The focused line is highlighted and carries
 * `aria-current`.
 */
export function InboundLineRail({
  focusedLineStage,
  lines,
  onSelect,
  registerLineButton,
  selectedLineId,
}: InboundLineRailProps) {
  return (
    <Card data-testid="inbound-line-rail">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dòng hàng</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chọn một dòng để thao tác; console bên phải bám theo dòng đang chọn.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.map((line) => {
          const isSelected = line.id === selectedLineId;
          const stage: InboundLineStage = isSelected ? focusedLineStage : 'not-started';
          return (
            <button
              key={line.id}
              type="button"
              className={cn(
                'min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted',
                isSelected && 'border-primary bg-primary/5',
              )}
              onClick={() => onSelect(line)}
              aria-pressed={isSelected}
              aria-current={isSelected ? 'true' : undefined}
              data-testid={`inbound-line-rail-button-${line.id}`}
              ref={(element) => registerLineButton(line.id, element)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">
                  Dòng {line.lineNumber} — {line.skuCode ?? line.skuId}
                </span>
                <InboundLineStageChip lineId={line.id} stage={stage} />
              </span>
              <span className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Dự kiến: {formatQuantity(line.expectedQuantity)} {line.uomCode ?? ''}
                </span>
                <span className="truncate">
                  Tham chiếu: {line.externalLineReference ?? 'không có'}
                </span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
