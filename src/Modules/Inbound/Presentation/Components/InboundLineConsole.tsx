import type { ReactNode, Ref } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

/**
 * Prominent inline blocked card. Bordered, high-visibility — never muted gray
 * fine print, never a popup. Driven by the page's single `blockedActionMessage`
 * source so the ribbon and this card cannot diverge.
 */
export function InboundBlockedActionHelper({ message }: { message: string }) {
  return (
    <Card
      data-testid="inbound-action-blocked"
      className="border-amber-300 bg-amber-50 text-amber-950"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          Thao tác chưa sẵn sàng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}

interface InboundLineConsoleProps {
  /** Read-only summary body swapped in when a `done` ribbon step is clicked. */
  children: ReactNode;
  /** Single authoritative blocked message (also feeds the ribbon). */
  blockedMessage?: string | null;
  /** `false` while a completed-step summary is shown (hides the step indicator). */
  isSummaryOpen: boolean;
  /**
   * Terminal (e.g. Cancelled) doc: the prominent terminal message always shows,
   * the active `Bước:` indicator is suppressed and no panels render.
   */
  isTerminal?: boolean;
  panelRef?: Ref<HTMLElement>;
  /** The one authoritative step indicator value, e.g. `Tiếp nhận hàng`. */
  stepLabel: string;
  /** Subordinate action label folded into the `Bước:` indicator, e.g. `Tiếp nhận hàng`. */
  stepActionLabel?: string;
  /** Prominent console title — the focused line label `Dòng {n} — {skuCode}`. */
  title: string;
}

/**
 * The focused-line console — the visual centerpiece and the ONLY place the
 * action form renders. The prominent title is the FOCUSED LINE; below it sits
 * exactly one authoritative `Bước: {label}` step indicator. Top → bottom:
 * (i) the focused-line title, (ii) one `Bước:` indicator (suppressed when a
 * completed-step summary is open or the doc is terminal), (iii) a prominent
 * inline blocked/terminal card, (iv) the active panel / completed-step summary
 * passed as children.
 */
export function InboundLineConsole({
  children,
  blockedMessage,
  isSummaryOpen,
  isTerminal = false,
  panelRef,
  stepLabel,
  stepActionLabel,
  title,
}: InboundLineConsoleProps) {
  const showStepIndicator = !isSummaryOpen && !isTerminal;
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      data-testid="inbound-line-console"
      className="min-w-0 space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold" data-testid="inbound-console-line-label">
          {title}
        </h2>
        {showStepIndicator ? (
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="inline-flex rounded-md border border-primary bg-primary/5 px-2 py-0.5 text-sm font-medium text-foreground"
              data-testid="inbound-console-step-indicator"
            >
              Bước: {stepLabel}
            </p>
            {stepActionLabel ? (
              <span
                className="text-sm font-medium text-muted-foreground"
                data-testid="inbound-console-step-action"
              >
                {stepActionLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {(isTerminal || !isSummaryOpen) && blockedMessage ? (
        <InboundBlockedActionHelper message={blockedMessage} />
      ) : null}
      {children}
    </section>
  );
}
