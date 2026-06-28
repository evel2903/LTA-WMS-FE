import { ClipboardCheck, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export interface InboundCompletedStepSummaryItem {
  label: string;
  value: string;
}

export interface InboundCompletedStepSummaryViewModel {
  items: InboundCompletedStepSummaryItem[];
  limitation?: string;
  lineLabel?: string;
  stepLabel: string;
}

interface InboundCompletedStepSummaryProps {
  onClose: () => void;
  summary: InboundCompletedStepSummaryViewModel;
}

export function InboundCompletedStepSummary({
  onClose,
  summary,
}: InboundCompletedStepSummaryProps) {
  return (
    <Card data-testid="inbound-completed-step-summary">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4" aria-hidden="true" />
              Tóm tắt bước đã hoàn tất
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.stepLabel}
              {summary.lineLabel ? ` - ${summary.lineLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-md border hover:bg-muted"
            onClick={onClose}
            aria-label="Đóng tóm tắt bước đã hoàn tất"
          >
            <X className="size-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 md:grid-cols-2">
          {summary.items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-md border bg-background p-3">
              <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
        {summary.limitation ? (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {summary.limitation}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Tóm tắt này chỉ đọc dữ liệu trong phiên hiện tại và không submit thao tác.
        </p>
      </CardContent>
    </Card>
  );
}
