import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { cn } from '@shared/Utils/Cn';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import type { ReceiptLine } from '@modules/InboundReceiving/Domain/Types/Receipt';

function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

function formatReceivedAt(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

interface InboundReceiptLineRailProps {
  receiptLines: ReceiptLine[];
  /** The effectively-active receipt line id (already resolved by the caller — pass
   * `confirmedReceiptLine?.id ?? null`, not the raw selection state). */
  selectedReceiptLineId: string | null;
  onSelect: (receiptLineId: string) => void;
}

/**
 * IDC-07: a plan line can now have MORE THAN ONE receipt line (multi-unit
 * serial-controlled receiving forces one receiving-confirm call per physical
 * unit — see IFB-14). Only rendered by the caller when there is more than one
 * receipt line for the selected plan line; each is independently actionable
 * for QC/LPN/Release once selected here.
 *
 * Responsive behaviour mirrors `InboundLineRail` (OP2-03): on mobile this
 * renders as a collapsible `Dòng khác` section so it doesn't push the
 * QC/LPN/Release console down the page every time a plan line has multiple
 * receipt lines — exactly the layout-push problem `InboundLineRail`'s
 * collapse mechanism exists to avoid for the outer plan-line rail.
 */
export function InboundReceiptLineRail({
  receiptLines,
  selectedReceiptLineId,
  onSelect,
}: InboundReceiptLineRailProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  return (
    <Card data-testid="inbound-receipt-line-rail">
      <CardHeader className="pb-3">
        <div className="hidden xl:block">
          <CardTitle className="text-base">Dòng đã nhận ({receiptLines.length})</CardTitle>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Dòng kế hoạch này có nhiều lần nhận hàng — chọn 1 dòng để QC/LPN/Release riêng.
          </p>
        </div>
        <button
          ref={toggleRef}
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-left xl:hidden"
          aria-expanded={mobileOpen}
          aria-controls="inbound-receipt-line-rail-list"
          aria-label={
            mobileOpen
              ? `Thu gọn danh sách dòng đã nhận (${receiptLines.length})`
              : `Mở danh sách dòng đã nhận (${receiptLines.length})`
          }
          data-testid="inbound-receipt-line-rail-toggle"
          onClick={() => setMobileOpen((current) => !current)}
        >
          <span className="text-base font-semibold">Dòng đã nhận ({receiptLines.length})</span>
          {mobileOpen ? (
            <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          )}
        </button>
      </CardHeader>
      <CardContent
        id="inbound-receipt-line-rail-list"
        data-testid="inbound-receipt-line-rail-list"
        className={cn('space-y-2', !mobileOpen && 'hidden xl:block')}
      >
        {receiptLines.map((line) => {
          const isSelected = line.id === selectedReceiptLineId;
          return (
            <button
              key={line.id}
              type="button"
              className={cn(
                'min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted',
                isSelected && 'border-primary bg-primary/5',
              )}
              onClick={() => {
                const wasOpen = mobileOpen;
                onSelect(line.id);
                setMobileOpen(false);
                if (wasOpen) {
                  window.setTimeout(() => toggleRef.current?.focus(), 0);
                }
              }}
              aria-pressed={isSelected}
              aria-current={isSelected ? 'true' : undefined}
              data-testid={`inbound-receipt-line-rail-button-${line.id}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 break-words font-medium">
                  {line.serialNumber ??
                    `${formatQuantity(line.actualQuantity)} ${line.uomCode ?? ''} · ${formatReceivedAt(line.receivedAt)}`}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {vietnameseOperationalLabel(line.status)}
                </span>
              </span>
              <span className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Nhận: {formatQuantity(line.actualQuantity)} {line.uomCode ?? ''}
                </span>
                <span className="break-words">{formatReceivedAt(line.receivedAt)}</span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
