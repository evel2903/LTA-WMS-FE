import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import {
  CONTROL_MODE_LABELS,
  PRECEDENCE_TIER_LABELS,
  skippedReasonLabel,
} from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';

interface RulePreviewPanelProps {
  preview: RulePreview | null;
  loading?: boolean;
  errorMessage?: string;
}

/**
 * Renders the B4 `RulePreviewResult` directly: winner, four-mode control summary,
 * skipped rules (with the reason enum LABELLED), conflicts (as DATA, not an
 * error), and read-only reason readiness. FE never recomputes any of this
 * (architecture 8.2) — it only displays what the backend returned.
 */
export function RulePreviewPanel({ preview, loading = false, errorMessage }: RulePreviewPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm">Running preview…</CardContent>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <CardContent className="text-destructive py-6 text-sm">{errorMessage}</CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm">
          No preview yet. Enter a context and run a preview to see how rules resolve.
        </CardContent>
      </Card>
    );
  }

  const { winner, controlMode, skippedRules, conflicts, reasonReadiness } = preview;

  return (
    <div className="space-y-4">
      {/* Winner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Winning rule</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {winner ? (
            <div className="space-y-1">
              <p>
                <span className="font-medium">{winner.ruleCode}</span>{' '}
                <span className="text-muted-foreground">{winner.ruleName}</span>
              </p>
              <p className="text-muted-foreground">
                Tier: {PRECEDENCE_TIER_LABELS[winner.precedenceTier]} · Control:{' '}
                {CONTROL_MODE_LABELS[winner.controlMode]}
              </p>
              <ControlModeBadge mode={winner.controlMode} />
            </div>
          ) : (
            <p className="text-muted-foreground">No rule applied to this context.</p>
          )}
        </CardContent>
      </Card>

      {/* Control-mode summary — four distinct modes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Control mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Outcome:{' '}
            <span className="font-medium">
              {controlMode.isHardBlock
                ? CONTROL_MODE_LABELS.HARD_BLOCK
                : controlMode.approvalRequired
                  ? CONTROL_MODE_LABELS.APPROVAL_REQUIRED
                  : controlMode.mode
                    ? CONTROL_MODE_LABELS[controlMode.mode]
                    : 'Allowed'}
            </span>
          </p>
          {controlMode.warning && (
            <p className="text-amber-700">
              {CONTROL_MODE_LABELS.SOFT_WARNING}: {controlMode.warning.message} (
              {controlMode.warning.ruleCode})
            </p>
          )}
          {controlMode.suggestion && (
            <p className="text-muted-foreground">
              {CONTROL_MODE_LABELS.AUTO_SUGGESTION}: {controlMode.suggestion.message} (
              {controlMode.suggestion.ruleCode})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Skipped rules — reason labelled from the finite taxonomy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skipped rules</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {skippedRules.length === 0 ? (
            <p className="text-muted-foreground">No skipped rules.</p>
          ) : (
            <ul className="space-y-2">
              {skippedRules.map((rule) => (
                <li key={rule.ruleCode} className="rounded-md border px-3 py-2">
                  <p>
                    <span className="font-medium">{rule.ruleCode}</span>{' '}
                    <span className="text-muted-foreground">{rule.ruleName}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {PRECEDENCE_TIER_LABELS[rule.precedenceTier]} · Reason:{' '}
                    {skippedReasonLabel(rule.reason)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Conflicts — DATA, not an error */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conflicts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {conflicts.length === 0 ? (
            <p className="text-muted-foreground">No conflicts detected.</p>
          ) : (
            <ul className="space-y-3">
              {conflicts.map((conflict) => (
                <li
                  key={`${conflict.precedenceTier}-${conflict.scopeKey}`}
                  className="rounded-md border px-3 py-2"
                >
                  <p className="text-muted-foreground text-xs">
                    {PRECEDENCE_TIER_LABELS[conflict.precedenceTier]} · Scope: {conflict.scopeKey} ·
                    Winner: {conflict.winnerRuleCode}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {conflict.rules.map((rule) => (
                      <li key={rule.ruleCode} className="flex items-center justify-between gap-2">
                        <span>
                          <span className="font-medium">{rule.ruleCode}</span>{' '}
                          <span className="text-muted-foreground">{rule.ruleName}</span>
                        </span>
                        <ControlModeBadge mode={rule.controlMode} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reason readiness — read-only metadata (Epic C enforces) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reason readiness</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {reasonReadiness ? (
            <ul className="text-muted-foreground space-y-1">
              <li>Requires reason: {reasonReadiness.requiresReason ? 'Yes' : 'No'}</li>
              <li>Requires evidence: {reasonReadiness.requiresEvidence ? 'Yes' : 'No'}</li>
              <li>Allow override: {reasonReadiness.allowOverride ? 'Yes' : 'No'}</li>
            </ul>
          ) : (
            <p className="text-muted-foreground">Not applicable.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
