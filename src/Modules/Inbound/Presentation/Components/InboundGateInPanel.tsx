import type { FormEvent } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';

interface InboundGateInPanelProps {
  gateReference: string;
  hasPlan: boolean;
  isGateInDone: boolean;
  isPending: boolean;
  onGateReferenceChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function getGateInHelper({
  gateReference,
  hasPlan,
  isGateInDone,
  isPending,
}: Pick<InboundGateInPanelProps, 'gateReference' | 'hasPlan' | 'isGateInDone' | 'isPending'>) {
  if (!hasPlan) return 'Chưa có chứng từ nhập kho để ghi nhận vào cổng.';
  if (isPending) return 'Đang ghi nhận vào cổng.';
  if (isGateInDone) return 'Đã ghi nhận vào cổng; không cần ghi nhận lại.';
  if (!gateReference.trim()) return 'Nhập tham chiếu cổng để ghi nhận.';
  return 'Sẵn sàng ghi nhận vào cổng.';
}

export function InboundGateInPanel({
  gateReference,
  hasPlan,
  isGateInDone,
  isPending,
  onGateReferenceChange,
  onSubmit,
}: InboundGateInPanelProps) {
  const helperText = getGateInHelper({ gateReference, hasPlan, isGateInDone, isPending });
  const isDisabled = !hasPlan || isGateInDone || isPending || !gateReference.trim();

  return (
    <Card data-testid="inbound-gate-in-panel">
      <CardHeader>
        <CardTitle className="text-base">Vào cổng</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm" htmlFor="inbound-gate-reference">
            Tham chiếu cổng
            <Input
              id="inbound-gate-reference"
              name="gateReference"
              value={gateReference}
              onChange={(event) => onGateReferenceChange(event.target.value)}
              disabled={!hasPlan || isGateInDone || isPending}
            />
          </label>
          <p className="text-sm text-muted-foreground" data-testid="inbound-gate-in-helper">
            {helperText}
          </p>
          <button
            type="submit"
            className="min-h-10 w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDisabled}
          >
            Ghi nhận vào cổng
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
