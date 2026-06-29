import type { FormEvent } from 'react';

import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import { useReasonCodeOptions } from '@modules/ReasonCode/Application/Queries/UseReasonCodeOptions';
import type { ReceivingReadiness } from '@modules/Inbound/Domain/Types/InboundPlan';

interface InboundReadinessPanelProps {
  gateInDone: boolean;
  hasPlan: boolean;
  isPending: boolean;
  isReadinessLoading: boolean;
  onReasonCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: ReceivingReadiness | null;
  reasonCode: string;
}

function getReadinessStatus(readiness: ReceivingReadiness | null, isReadinessLoading: boolean) {
  if (isReadinessLoading) return 'Đang kiểm tra sẵn sàng.';
  if (!readiness) return 'Chưa có kết quả kiểm tra sẵn sàng.';
  if (readiness.overrideAccepted) return 'Ghi đè đã được chấp nhận.';
  if (readiness.allowed) return 'Điều kiện tiếp nhận đã sẵn sàng.';
  return readiness.reason;
}

function getReadinessHelper({
  gateInDone,
  hasPlan,
  isPending,
  isReadinessLoading,
  readiness,
  reasonCode,
}: Pick<
  InboundReadinessPanelProps,
  'gateInDone' | 'hasPlan' | 'isPending' | 'isReadinessLoading' | 'readiness' | 'reasonCode'
>) {
  if (!hasPlan) return 'Chưa có chứng từ nhập kho để kiểm tra readiness.';
  if (isPending) return 'Đang gửi yêu cầu ghi đè kiểm tra sẵn sàng.';
  if (isReadinessLoading) return 'Đang kiểm tra sẵn sàng; vui lòng chờ kết quả mới nhất.';
  if (readiness?.allowed || readiness?.overrideAccepted) {
    return 'Readiness đã đạt; không cần ghi đè.';
  }
  if (readiness?.gateInRequired && !readiness.gateInRecorded && !gateInDone) {
    return 'Vào cổng chưa được ghi nhận; nhập mã lý do nếu cần ghi đè readiness.';
  }
  if (!reasonCode.trim()) return 'Nhập mã lý do để ghi đè kiểm tra sẵn sàng.';
  return 'Sẵn sàng gửi yêu cầu ghi đè readiness.';
}

export function InboundReadinessPanel({
  gateInDone,
  hasPlan,
  isPending,
  isReadinessLoading,
  onReasonCodeChange,
  onSubmit,
  readiness,
  reasonCode,
}: InboundReadinessPanelProps) {
  const {
    options: reasonCodeOptions,
    isLoading: reasonCodesLoading,
    isError: reasonCodesError,
  } = useReasonCodeOptions({ action: 'Override' });
  const statusText = getReadinessStatus(readiness, isReadinessLoading);
  const helperText = getReadinessHelper({
    gateInDone,
    hasPlan,
    isPending,
    isReadinessLoading,
    readiness,
    reasonCode,
  });
  const isDisabled =
    !hasPlan ||
    isPending ||
    isReadinessLoading ||
    Boolean(readiness?.allowed || readiness?.overrideAccepted) ||
    !reasonCode.trim();

  return (
    <Card data-testid="inbound-readiness-panel">
      <CardHeader>
        <CardTitle className="text-base">Kiểm tra sẵn sàng / override</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <p
            className="break-words text-sm text-muted-foreground"
            data-testid="inbound-readiness-status"
          >
            {isReadinessLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {statusText}
              </span>
            ) : (
              statusText
            )}
          </p>
          <LookupSelect
            id="inbound-readiness-reason-code"
            name="readinessReasonCode"
            label="Mã lý do sẵn sàng"
            value={reasonCode}
            placeholder="Chọn mã lý do"
            options={reasonCodeOptions}
            isLoading={reasonCodesLoading}
            isError={reasonCodesError}
            emptyMessage="Chưa có mã lý do khả dụng."
            errorMessage="Không tải được danh sách mã lý do."
            disabled={
              !hasPlan ||
              isPending ||
              isReadinessLoading ||
              Boolean(readiness?.allowed || readiness?.overrideAccepted)
            }
            onChange={onReasonCodeChange}
          />
          <p
            className="break-words text-sm text-muted-foreground"
            data-testid="inbound-readiness-helper"
          >
            {helperText}
          </p>
          <button
            type="submit"
            className="min-h-10 w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDisabled}
          >
            Ghi đè kiểm tra sẵn sàng
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
