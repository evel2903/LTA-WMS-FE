import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';
import {
  VI_CONTROL_MODE_LABELS,
  viControlModeLabel,
  viPrecedenceTierLabel,
  viSkippedReasonLabel,
} from '@modules/WarehouseProfile/Presentation/Constants/WarehouseProfileDisplayText';

interface RulePreviewPanelProps {
  preview: RulePreview | null;
  loading?: boolean;
  errorMessage?: string;
}

const TOP_LEVEL_ALERT_CLASS_NAME = 'min-h-28 place-content-center py-10 text-center';

function displayValue(value: string | null | undefined, emptyLabel = 'Chưa xác định'): string {
  const normalized = value?.trim();
  return normalized ? normalized : emptyLabel;
}

/**
 * Renders the B4 `RulePreviewResult` directly: winner, four-mode control summary,
 * skipped rules (with the reason enum LABELLED), conflicts (as DATA, not an
 * error), and read-only reason readiness. FE never recomputes any of this
 * (architecture 8.2) — it only displays what the backend returned.
 */
export function RulePreviewPanel({
  preview,
  loading = false,
  errorMessage,
}: RulePreviewPanelProps) {
  if (loading) {
    return (
      <Alert variant="info" role="status" className={TOP_LEVEL_ALERT_CLASS_NAME}>
        <AlertDescription className="justify-items-center">Đang chạy preview...</AlertDescription>
      </Alert>
    );
  }

  if (errorMessage) {
    return (
      <Alert variant="destructive" role="alert" className={TOP_LEVEL_ALERT_CLASS_NAME}>
        <AlertTitle>Không thể chạy preview</AlertTitle>
        <AlertDescription className="justify-items-center">{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (!preview) {
    return (
      <Alert variant="info" role="status" className={TOP_LEVEL_ALERT_CLASS_NAME}>
        <AlertDescription className="justify-items-center">
          Chưa có preview. Nhập ngữ cảnh và chạy preview để xem cách quy tắc được áp dụng.
        </AlertDescription>
      </Alert>
    );
  }

  const { winner, controlMode, skippedRules, conflicts, reasonReadiness, actorContext } = preview;
  const actorValues = [
    actorContext.actorUserId,
    actorContext.action,
    actorContext.objectType,
    actorContext.objectId,
    actorContext.reasonCode,
  ];
  const hasActorContext = actorValues.some((value) => value?.trim());

  return (
    <div className="space-y-4">
      {/* Winner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quy tắc thắng</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {winner ? (
            <div className="space-y-1">
              <p>
                <span className="font-medium">{winner.ruleCode}</span>{' '}
                <span className="text-muted-foreground">{winner.ruleName}</span>
              </p>
              <p className="text-muted-foreground">
                Tầng: {viPrecedenceTierLabel(winner.precedenceTier)} · Kiểm soát:{' '}
                {viControlModeLabel(winner.controlMode)}
              </p>
              <ControlModeBadge mode={winner.controlMode} />
            </div>
          ) : (
            <Alert variant="info" role="status">
              <AlertDescription>Không có quy tắc nào áp dụng cho ngữ cảnh này.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Control-mode summary — four distinct modes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chế độ kiểm soát</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Kết quả kiểm soát:{' '}
            <span className="font-medium">
              {controlMode.isHardBlock
                ? VI_CONTROL_MODE_LABELS.HARD_BLOCK
                : controlMode.approvalRequired
                  ? VI_CONTROL_MODE_LABELS.APPROVAL_REQUIRED
                  : controlMode.mode
                    ? viControlModeLabel(controlMode.mode)
                    : 'Cho phép'}
            </span>
          </p>
          {controlMode.warning && (
            <Alert variant="warning" role="status">
              <AlertTitle>{VI_CONTROL_MODE_LABELS.SOFT_WARNING}</AlertTitle>
              <AlertDescription>
                {controlMode.warning.message} ({controlMode.warning.ruleCode})
              </AlertDescription>
            </Alert>
          )}
          {controlMode.suggestion && (
            <Alert variant="info" role="status">
              <AlertTitle>{VI_CONTROL_MODE_LABELS.AUTO_SUGGESTION}</AlertTitle>
              <AlertDescription>
                {controlMode.suggestion.message} ({controlMode.suggestion.ruleCode})
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Skipped rules — reason labelled from the finite taxonomy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quy tắc bị bỏ qua</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {skippedRules.length === 0 ? (
            <Alert variant="info" role="status">
              <AlertDescription>Không có quy tắc bị bỏ qua.</AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-2">
              {skippedRules.map((rule) => (
                <li key={rule.ruleCode} className="rounded-md border px-3 py-2">
                  <p>
                    <span className="font-medium">{rule.ruleCode}</span>{' '}
                    <span className="text-muted-foreground">{rule.ruleName}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {viPrecedenceTierLabel(rule.precedenceTier)} · Lý do:{' '}
                    {viSkippedReasonLabel(rule.reason)}
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
          <CardTitle className="text-base">Xung đột</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {conflicts.length === 0 ? (
            <Alert variant="info" role="status">
              <AlertDescription>Không phát hiện xung đột.</AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-3">
              {conflicts.map((conflict, index) => (
                <li
                  key={`${conflict.precedenceTier}-${conflict.scopeKey || 'all'}-${index}`}
                  className="rounded-md border px-3 py-2"
                >
                  <p className="text-muted-foreground text-xs">
                    {viPrecedenceTierLabel(conflict.precedenceTier)} · Phạm vi:{' '}
                    {displayValue(conflict.scopeKey, 'Tất cả')} · Quy tắc thắng:{' '}
                    {displayValue(conflict.winnerRuleCode)}
                  </p>
                  {conflict.rules.length === 0 ? (
                    <Alert variant="info" role="status" className="mt-2">
                      <AlertDescription>Không có quy tắc trong xung đột này.</AlertDescription>
                    </Alert>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {conflict.rules.map((rule) => (
                        <li
                          key={rule.ruleCode}
                          className="flex min-w-0 flex-wrap items-center justify-between gap-2"
                        >
                          <span className="min-w-0 break-words">
                            <span className="font-medium">{rule.ruleCode}</span>{' '}
                            <span className="text-muted-foreground">{rule.ruleName}</span>
                          </span>
                          <ControlModeBadge mode={rule.controlMode} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reason readiness — read-only metadata (Epic C enforces) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mức sẵn sàng mã lý do</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {reasonReadiness ? (
            <ul className="text-muted-foreground space-y-1">
              <li>Cần mã lý do: {reasonReadiness.requiresReason ? 'Có' : 'Không'}</li>
              <li>Cần bằng chứng: {reasonReadiness.requiresEvidence ? 'Có' : 'Không'}</li>
              <li>Cho phép ghi đè: {reasonReadiness.allowOverride ? 'Có' : 'Không'}</li>
            </ul>
          ) : (
            <Alert variant="info" role="status">
              <AlertDescription>Không áp dụng.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ngữ cảnh tác nhân</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {hasActorContext ? (
            <dl className="grid gap-1 text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <dt className="min-w-0 break-words">Người thực hiện</dt>
              <dd className="min-w-0 break-words text-foreground">
                {displayValue(actorContext.actorUserId)}
              </dd>
              <dt className="min-w-0 break-words">Hành động</dt>
              <dd className="min-w-0 break-words text-foreground">
                {displayValue(actorContext.action)}
              </dd>
              <dt className="min-w-0 break-words">Loại đối tượng</dt>
              <dd className="min-w-0 break-words text-foreground">
                {displayValue(actorContext.objectType)}
              </dd>
              <dt className="min-w-0 break-words">Mã đối tượng</dt>
              <dd className="min-w-0 break-words text-foreground">
                {displayValue(actorContext.objectId)}
              </dd>
              <dt className="min-w-0 break-words">Mã lý do</dt>
              <dd className="min-w-0 break-words text-foreground">
                {displayValue(actorContext.reasonCode)}
              </dd>
            </dl>
          ) : (
            <Alert variant="info" role="status">
              <AlertDescription>Không có ngữ cảnh tác nhân.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
