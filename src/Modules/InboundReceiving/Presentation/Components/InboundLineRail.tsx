import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { cn } from '@shared/Utils/Cn';
import type { InboundPlanLine } from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type { InboundLineStage } from '@modules/InboundReceiving/Presentation/Components/InboundLineStage';
import { InboundLineStageChip } from '@modules/InboundReceiving/Presentation/Components/InboundLineStageChip';

function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

interface InboundLineRailProps {
  /** Real stage per plan line id, so every row reflects its own progress (not just the focused one). */
  lineStages: Record<string, InboundLineStage>;
  lines: InboundPlanLine[];
  onSelect: (line: InboundPlanLine) => void;
  selectedLineId: string | null;
}

/**
 * The single unified line picker (replaces the desktop plan-line table AND the
 * old `InboundLineQueue`). Writes selection through one `setSelectedLineId`
 * mechanism (`onSelect`). The focused line is highlighted and carries
 * `aria-current`.
 *
 * Responsive behaviour (OP2-03): on desktop (`xl`) the rail is the always-visible
 * left column. On mobile (below `xl`) it renders as a collapsible
 * `Dòng khác ({count})` section sitting directly below the focused console, so
 * line selection stays reachable without pushing the action form down the page.
 * Tapping a line collapses the section again to bring the console back to top.
 */
export function InboundLineRail({
  lineStages,
  lines,
  onSelect,
  selectedLineId,
}: InboundLineRailProps) {
  // Mobile-only collapse state; collapsed by default so the console stays pinned
  // at the top of the action area. Desktop always shows the list via `xl:` rules
  // regardless of this flag.
  const [mobileOpen, setMobileOpen] = useState(false);
  // Ref to the mobile `Dòng khác` toggle button. When tapping a line collapses
  // the rail on mobile, the just-tapped line button becomes `display:none`, so we
  // move focus to this always-rendered toggle to keep focus on a visible element.
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  return (
    <Card data-testid="inbound-line-rail">
      <CardHeader className="pb-3">
        {/* Desktop title: always-visible left column. */}
        <div className="hidden xl:block">
          <CardTitle className="text-base">Dòng hàng</CardTitle>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Chọn một dòng để thao tác; console bên phải bám theo dòng đang chọn.
          </p>
        </div>
        {/* Mobile collapsible control: `Dòng khác ({count})`. Uses a plain `<span>`
            (not `CardTitle`, which renders a heading) so a heading is never nested
            inside an interactive button. `aria-label` carries the single accessible
            name + expand/collapse intent, with `aria-expanded` conveying state. */}
        <button
          ref={toggleRef}
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-left xl:hidden"
          aria-expanded={mobileOpen}
          aria-controls="inbound-line-rail-list"
          aria-label={
            mobileOpen
              ? `Thu gọn danh sách dòng khác (${lines.length})`
              : `Mở danh sách dòng khác (${lines.length})`
          }
          data-testid="inbound-line-rail-toggle"
          onClick={() => setMobileOpen((current) => !current)}
        >
          <span className="text-base font-semibold">Dòng khác ({lines.length})</span>
          {mobileOpen ? (
            <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          )}
        </button>
      </CardHeader>
      <CardContent
        id="inbound-line-rail-list"
        data-testid="inbound-line-rail-list"
        className={cn('space-y-2', !mobileOpen && 'hidden xl:block')}
      >
        {lines.map((line) => {
          const isSelected = line.id === selectedLineId;
          const stage: InboundLineStage = lineStages[line.id] ?? 'not-started';
          return (
            <button
              key={line.id}
              type="button"
              className={cn(
                'min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted',
                isSelected && 'border-primary bg-primary/5',
              )}
              onClick={() => {
                // Capture whether the rail was actually open BEFORE collapsing.
                // On desktop the rail list is always shown and `mobileOpen` stays
                // false, so this is only ever true on mobile when the section is
                // expanded — i.e. when the tap genuinely collapses the rail.
                const wasOpen = mobileOpen;
                onSelect(line);
                // Collapse on mobile so tapping a line brings the console back to
                // the top of the action area (desktop ignores this flag).
                setMobileOpen(false);
                if (wasOpen) {
                  // The rail just collapsed (mobile only): the tapped line button
                  // becomes `display:none`, so move focus to the always-rendered
                  // toggle to keep focus on a visible element. On desktop `wasOpen`
                  // is false, so focus stays naturally on the clicked line button.
                  window.setTimeout(() => toggleRef.current?.focus(), 0);
                }
              }}
              aria-pressed={isSelected}
              aria-current={isSelected ? 'true' : undefined}
              data-testid={`inbound-line-rail-button-${line.id}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 break-words font-medium">
                  Dòng {line.lineNumber} — {line.skuCode ?? line.skuId}
                </span>
                <InboundLineStageChip lineId={line.id} stage={stage} />
              </span>
              <span className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Dự kiến: {formatQuantity(line.expectedQuantity)} {line.uomCode ?? ''}
                </span>
                <span className="break-words">
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
