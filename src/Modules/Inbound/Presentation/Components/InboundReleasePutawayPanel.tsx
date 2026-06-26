import type { FormEvent, ReactNode } from 'react';

import { PackageCheck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import type {
  InboundLpn,
  InboundPutawayRelease,
  ReceiptLine,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface InboundReleasePutawayPanelProps {
  canConfirmInboundLpn: boolean;
  canReleaseInboundToPutaway: boolean;
  confirmedInboundLpn: InboundLpn | null;
  confirmedReceiptLine: ReceiptLine | null;
  hasConfirmInboundLpnError: boolean;
  isConfirmInboundLpnPending: boolean;
  isReleaseInboundToPutawayPending: boolean;
  lpnCode: string;
  lpnIdempotencyKey: string;
  onLpnCodeChange: (value: string) => void;
  onLpnIdempotencyKeyChange: (value: string) => void;
  onReleaseAttemptLabelOverrideChange: (value: boolean) => void;
  onReleaseCurrentLocationCodeChange: (value: string) => void;
  onReleaseEvidenceRefsChange: (value: string) => void;
  onReleaseIdempotencyKeyChange: (value: string) => void;
  onReleaseReasonCodeChange: (value: string) => void;
  onReleaseRequireLpnChange: (value: boolean) => void;
  onSsccCodeChange: (value: string) => void;
  onSubmitInboundLpn: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitReleaseInboundToPutaway: (event: FormEvent<HTMLFormElement>) => void;
  putawayReady: boolean;
  putawayRelease: InboundPutawayRelease | null;
  receivingSession: ReceivingSession | null;
  releaseAttemptLabelOverride: boolean;
  releaseCurrentLocationCode: string;
  releaseErrorMessage: string | null;
  releaseEvidenceRefs: string;
  releaseIdempotencyKey: string;
  releaseReasonCode: string;
  releaseRequireLpn: boolean;
  ssccCode: string;
}

function getLpnHelper({
  confirmedReceiptLine,
  isPending,
  lpnCode,
  lpnIdempotencyKey,
  receivingSession,
}: {
  confirmedReceiptLine: ReceiptLine | null;
  isPending: boolean;
  lpnCode: string;
  lpnIdempotencyKey: string;
  receivingSession: ReceivingSession | null;
}) {
  if (!receivingSession) return 'Cần phiên tiếp nhận trước khi xác nhận LPN/SSCC.';
  if (!confirmedReceiptLine) return 'Cần xác nhận dòng tiếp nhận trước khi xác nhận LPN/SSCC.';
  if (isPending) return 'Đang xác nhận LPN/SSCC.';
  if (!lpnCode.trim()) return 'Nhập mã LPN để xác nhận.';
  if (!lpnIdempotencyKey.trim()) return 'Cần khóa idempotency LPN.';
  return 'Sẵn sàng xác nhận LPN/SSCC.';
}

function TechnicalDetails({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <details className="rounded-md border bg-muted/30 p-3 text-sm" data-testid={testId}>
      <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function getReleaseHelper({
  confirmedInboundLpn,
  confirmedReceiptLine,
  isPending,
  putawayReady,
  receivingSession,
  releaseIdempotencyKey,
  releaseRequireLpn,
}: {
  confirmedInboundLpn: InboundLpn | null;
  confirmedReceiptLine: ReceiptLine | null;
  isPending: boolean;
  putawayReady: boolean;
  receivingSession: ReceivingSession | null;
  releaseIdempotencyKey: string;
  releaseRequireLpn: boolean;
}) {
  if (!receivingSession) return 'Cần phiên tiếp nhận trước khi phát hành cất hàng.';
  if (!confirmedReceiptLine) return 'Cần xác nhận dòng tiếp nhận trước khi phát hành cất hàng.';
  if (!putawayReady) return 'Cần trạng thái READY_FOR_PUTAWAY trước khi phát hành cất hàng.';
  if (releaseRequireLpn && !confirmedInboundLpn)
    return 'Cần xác nhận LPN vì cấu hình đang yêu cầu LPN.';
  if (isPending) return 'Đang phát hành sang cất hàng.';
  if (!releaseIdempotencyKey.trim()) return 'Cần khóa idempotency phát hành.';
  if (!releaseRequireLpn && !confirmedInboundLpn) {
    return 'LPN đang được bỏ yêu cầu trên UI; nếu WarehouseProfile yêu cầu LPN, backend vẫn có thể chặn phát hành.';
  }
  return 'Sẵn sàng phát hành sang cất hàng.';
}

export function InboundReleasePutawayPanel({
  canConfirmInboundLpn,
  canReleaseInboundToPutaway,
  confirmedInboundLpn,
  confirmedReceiptLine,
  hasConfirmInboundLpnError,
  isConfirmInboundLpnPending,
  isReleaseInboundToPutawayPending,
  lpnCode,
  lpnIdempotencyKey,
  onLpnCodeChange,
  onLpnIdempotencyKeyChange,
  onReleaseAttemptLabelOverrideChange,
  onReleaseCurrentLocationCodeChange,
  onReleaseEvidenceRefsChange,
  onReleaseIdempotencyKeyChange,
  onReleaseReasonCodeChange,
  onReleaseRequireLpnChange,
  onSsccCodeChange,
  onSubmitInboundLpn,
  onSubmitReleaseInboundToPutaway,
  putawayReady,
  putawayRelease,
  receivingSession,
  releaseAttemptLabelOverride,
  releaseCurrentLocationCode,
  releaseErrorMessage,
  releaseEvidenceRefs,
  releaseIdempotencyKey,
  releaseReasonCode,
  releaseRequireLpn,
  ssccCode,
}: InboundReleasePutawayPanelProps) {
  const lpnHelper = getLpnHelper({
    confirmedReceiptLine,
    isPending: isConfirmInboundLpnPending,
    lpnCode,
    lpnIdempotencyKey,
    receivingSession,
  });
  const releaseHelper = getReleaseHelper({
    confirmedInboundLpn,
    confirmedReceiptLine,
    isPending: isReleaseInboundToPutawayPending,
    putawayReady,
    receivingSession,
    releaseIdempotencyKey,
    releaseRequireLpn,
  });

  return (
    <Card data-testid="inbound-release-putaway-panel">
      <CardHeader>
        <CardTitle className="text-base">LPN/SSCC và phát hành cất hàng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={onSubmitInboundLpn}>
          <label className="grid gap-1 text-sm" htmlFor="inbound-lpn-code">
            Mã LPN
            <Input
              id="inbound-lpn-code"
              name="lpnCode"
              value={lpnCode}
              onChange={(event) => onLpnCodeChange(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-sscc-code">
            Mã SSCC
            <Input
              id="inbound-sscc-code"
              name="ssccCode"
              value={ssccCode}
              onChange={(event) => onSsccCodeChange(event.target.value)}
            />
          </label>
          <TechnicalDetails testId="inbound-lpn-technical-details">
            <label className="grid gap-1 text-sm" htmlFor="inbound-lpn-idempotency-key">
              Khóa idempotency LPN
              <Input
                id="inbound-lpn-idempotency-key"
                name="lpnIdempotencyKey"
                value={lpnIdempotencyKey}
                onChange={(event) => onLpnIdempotencyKeyChange(event.target.value)}
              />
            </label>
          </TechnicalDetails>
          <p className="break-words text-sm text-muted-foreground" data-testid="inbound-lpn-helper">
            {lpnHelper}
          </p>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConfirmInboundLpn || isConfirmInboundLpnPending}
          >
            <PackageCheck className="size-4" />
            Xác nhận LPN/SSCC
          </button>
        </form>

        {confirmedInboundLpn && (
          <p className="break-words text-sm text-muted-foreground">
            LPN {confirmedInboundLpn.lpnCode}
            {confirmedInboundLpn.ssccCode ? ` / ${confirmedInboundLpn.ssccCode}` : ''}
            {confirmedInboundLpn.isDuplicate ? ' đã dùng lại' : ''}
          </p>
        )}

        <form className="space-y-3 border-t pt-3" onSubmit={onSubmitReleaseInboundToPutaway}>
          <label className="grid gap-1 text-sm" htmlFor="inbound-release-current-location-code">
            Mã vị trí hiện tại
            <Input
              id="inbound-release-current-location-code"
              name="releaseCurrentLocationCode"
              value={releaseCurrentLocationCode}
              onChange={(event) => onReleaseCurrentLocationCodeChange(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor="inbound-release-require-lpn">
            <input
              id="inbound-release-require-lpn"
              name="releaseRequireLpn"
              type="checkbox"
              checked={releaseRequireLpn}
              onChange={(event) => onReleaseRequireLpnChange(event.target.checked)}
            />
            Yêu cầu LPN
          </label>
          <label
            className="flex items-center gap-2 text-sm"
            htmlFor="inbound-release-attempt-label-override"
          >
            <input
              id="inbound-release-attempt-label-override"
              name="releaseAttemptLabelOverride"
              type="checkbox"
              checked={releaseAttemptLabelOverride}
              onChange={(event) => onReleaseAttemptLabelOverrideChange(event.target.checked)}
            />
            Ghi đè nhãn
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-release-reason-code">
            Mã lý do phát hành
            <Input
              id="inbound-release-reason-code"
              name="releaseReasonCode"
              value={releaseReasonCode}
              onChange={(event) => onReleaseReasonCodeChange(event.target.value)}
              placeholder="RC-V1-LABEL-OVERRIDE"
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-release-evidence-refs">
            Tham chiếu bằng chứng phát hành
            <Input
              id="inbound-release-evidence-refs"
              name="releaseEvidenceRefs"
              value={releaseEvidenceRefs}
              onChange={(event) => onReleaseEvidenceRefsChange(event.target.value)}
              placeholder="photo://label/override-1"
            />
          </label>
          <TechnicalDetails testId="inbound-release-technical-details">
            <label className="grid gap-1 text-sm" htmlFor="inbound-release-idempotency-key">
              Khóa idempotency phát hành
              <Input
                id="inbound-release-idempotency-key"
                name="releaseIdempotencyKey"
                value={releaseIdempotencyKey}
                onChange={(event) => onReleaseIdempotencyKeyChange(event.target.value)}
              />
            </label>
          </TechnicalDetails>
          <p
            className="break-words text-sm text-muted-foreground"
            data-testid="inbound-release-helper"
          >
            {releaseHelper}
          </p>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canReleaseInboundToPutaway || isReleaseInboundToPutawayPending}
          >
            <PackageCheck className="size-4" />
            Phát hành sang cất hàng
          </button>
        </form>

        {putawayRelease && (
          <p className="break-words text-sm text-muted-foreground">
            Đã phát hành {putawayRelease.quantity} {putawayRelease.uomCode ?? putawayRelease.uomId}{' '}
            / {putawayRelease.inventoryStatusCode}
            {putawayRelease.currentLocationCode ? ` / ${putawayRelease.currentLocationCode}` : ''}
          </p>
        )}
        {hasConfirmInboundLpnError ? (
          <p className="text-sm text-destructive">Không thể xác nhận LPN/SSCC.</p>
        ) : null}
        {releaseErrorMessage ? (
          <p className="text-sm text-destructive">{releaseErrorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
