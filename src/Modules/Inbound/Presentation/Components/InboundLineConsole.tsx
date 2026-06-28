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
  /**
   * `true` when the focused line is eligible to report a discrepancy (the single
   * canonical trigger is rendered but disabled until eligible). When `false` the
   * trigger stays visible-but-disabled with a helper; when the trigger should be
   * fully hidden (terminal / no plan) pass `showDiscrepancyTrigger={false}`.
   */
  canReportDiscrepancy?: boolean;
  /** Helper line under the discrepancy trigger explaining its disabled state. */
  discrepancyTriggerHelper?: string;
  /**
   * Label for the discrepancy trigger button. Defaults to `Báo sai lệch dòng
   * này`; switches to a review/update wording once a discrepancy is on file so
   * the operator can tell one was already reported.
   */
  discrepancyTriggerLabel?: string;
  /** `false` while a completed-step summary is shown (hides the step indicator). */
  isSummaryOpen: boolean;
  /**
   * Terminal (e.g. Cancelled) doc: the prominent terminal message always shows,
   * the active `Bước:` indicator is suppressed and no panels render.
   */
  isTerminal?: boolean;
  /** Opens the single canonical discrepancy overlay route for the focused line. */
  onOpenDiscrepancy?: () => void;
  panelRef?: Ref<HTMLElement>;
  /**
   * Whether to render the single canonical `Báo sai lệch dòng này` trigger. It
   * is suppressed when terminal, when a completed-step summary is open, or when
   * there is no focused line.
   */
  showDiscrepancyTrigger?: boolean;
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
  canReportDiscrepancy = false,
  discrepancyTriggerHelper,
  discrepancyTriggerLabel = 'Báo sai lệch dòng này',
  isSummaryOpen,
  isTerminal = false,
  onOpenDiscrepancy,
  panelRef,
  showDiscrepancyTrigger = false,
  stepLabel,
  stepActionLabel,
  title,
}: InboundLineConsoleProps) {
  const showStepIndicator = !isSummaryOpen && !isTerminal;
  // The single canonical discrepancy trigger lives in the focused-line context.
  // It is suppressed entirely when terminal or while a completed-step summary is
  // open; otherwise it shows (disabled until the line is eligible).
  const renderDiscrepancyTrigger =
    showDiscrepancyTrigger && !isTerminal && !isSummaryOpen && Boolean(onOpenDiscrepancy);
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
      {renderDiscrepancyTrigger ? (
        <div className="space-y-1" data-testid="inbound-discrepancy-trigger">
          <button
            type="button"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canReportDiscrepancy}
            onClick={onOpenDiscrepancy}
            data-testid="inbound-discrepancy-trigger-button"
          >
            <AlertTriangle className="size-4" aria-hidden="true" />
            {discrepancyTriggerLabel}
          </button>
          {discrepancyTriggerHelper ? (
            <p
              className="break-words text-sm text-muted-foreground"
              data-testid="inbound-discrepancy-trigger-helper"
            >
              {discrepancyTriggerHelper}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
