import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRightLeft, Loader2, ShieldCheck } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useInventoryControlMutations } from '@modules/Inventory/Application/Commands/UseInventoryControlMutations';
import type { InventoryControlResult } from '@modules/Inventory/Domain/Types/InventoryControl';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Không thể hoàn tất yêu cầu kiểm soát tồn kho.';
}

function parseEvidenceRefs(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveQuantity(value: string): number | null {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function ResultPanel({ result }: { result: InventoryControlResult }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <ShieldCheck className="size-4" />
        {result.eventType} {result.isDuplicate ? '(trùng lặp)' : ''}
      </div>
      <div className="text-muted-foreground mt-2 grid gap-1 text-xs">
        <div>Giao dịch: {result.inventoryTransaction.transactionCode}</div>
        <div>Dịch chuyển: {result.inventoryMovement.movementCode}</div>
        <div>
          Trạng thái: {result.inventoryTransaction.fromInventoryStatusCode} -&gt;{' '}
          {result.inventoryTransaction.toInventoryStatusCode}
        </div>
        <div>
          Vị trí:{' '}
          {result.inventoryMovement.fromLocationCode ?? result.inventoryMovement.fromLocationId}{' '}
          -&gt; {result.inventoryMovement.toLocationCode}
        </div>
        <div>
          Tồn: {result.sourceBalance.qtyOnHand} nguồn / {result.targetBalance.qtyOnHand} đích
        </div>
        <div>Outbox: {result.outboxMessageId ?? 'chưa phát'}</div>
      </div>
    </div>
  );
}

export function InventoryControlPanel() {
  const mutations = useInventoryControlMutations();
  const [latestResult, setLatestResult] = useState<InventoryControlResult | null>(null);
  const [statusSourceBalanceId, setStatusSourceBalanceId] = useState('');
  const [targetStatusCode, setTargetStatusCode] = useState('AVAILABLE');
  const [statusQuantity, setStatusQuantity] = useState('');
  const [statusReasonCode, setStatusReasonCode] = useState('');
  const [statusReasonNote, setStatusReasonNote] = useState('');
  const [statusEvidenceRefs, setStatusEvidenceRefs] = useState('');
  const [statusIdempotencyKey, setStatusIdempotencyKey] = useState('');
  const [moveSourceBalanceId, setMoveSourceBalanceId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [moveQuantity, setMoveQuantity] = useState('');
  const [moveReasonCode, setMoveReasonCode] = useState('');
  const [moveReasonNote, setMoveReasonNote] = useState('');
  const [moveEvidenceRefs, setMoveEvidenceRefs] = useState('');
  const [moveIdempotencyKey, setMoveIdempotencyKey] = useState('');

  const parsedStatusQuantity = positiveQuantity(statusQuantity);
  const parsedMoveQuantity = positiveQuantity(moveQuantity);
  const canChangeStatus =
    statusSourceBalanceId.trim().length > 0 &&
    targetStatusCode.trim().length > 0 &&
    parsedStatusQuantity !== null &&
    statusReasonCode.trim().length > 0 &&
    statusIdempotencyKey.trim().length > 0;
  const canMoveInternal =
    moveSourceBalanceId.trim().length > 0 &&
    targetLocationId.trim().length > 0 &&
    parsedMoveQuantity !== null &&
    moveReasonCode.trim().length > 0 &&
    moveIdempotencyKey.trim().length > 0;
  const statusError = errorMessage(mutations.changeStatus.error);
  const moveError = errorMessage(mutations.moveInternal.error);

  const handleStatusChange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canChangeStatus || !parsedStatusQuantity) return;
    setLatestResult(null);
    mutations.changeStatus.mutate(
      {
        sourceBalanceId: statusSourceBalanceId.trim(),
        targetInventoryStatusCode: targetStatusCode.trim(),
        quantity: parsedStatusQuantity,
        reasonCode: statusReasonCode.trim(),
        reasonNote: statusReasonNote.trim() || undefined,
        evidenceRefs: parseEvidenceRefs(statusEvidenceRefs),
        idempotencyKey: statusIdempotencyKey.trim(),
      },
      { onSuccess: setLatestResult },
    );
  };

  const handleInternalMove = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMoveInternal || !parsedMoveQuantity) return;
    setLatestResult(null);
    mutations.moveInternal.mutate(
      {
        sourceBalanceId: moveSourceBalanceId.trim(),
        targetLocationId: targetLocationId.trim(),
        quantity: parsedMoveQuantity,
        reasonCode: moveReasonCode.trim(),
        reasonNote: moveReasonNote.trim() || undefined,
        evidenceRefs: parseEvidenceRefs(moveEvidenceRefs),
        idempotencyKey: moveIdempotencyKey.trim(),
      },
      { onSuccess: setLatestResult },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="size-4" />
          <CardTitle className="text-base">Kiểm soát tồn kho</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form aria-label="Đổi trạng thái" className="space-y-3" onSubmit={handleStatusChange}>
          <div className="text-sm font-medium">Đổi trạng thái</div>
          <label className="grid gap-1 text-sm">
            ID số dư nguồn đổi trạng thái
            <Input
              value={statusSourceBalanceId}
              onChange={(event) => setStatusSourceBalanceId(event.target.value)}
              placeholder="balance-source"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Trạng thái đích
              <Input
                value={targetStatusCode}
                onChange={(event) => setTargetStatusCode(event.target.value)}
                placeholder="AVAILABLE"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Số lượng đổi trạng thái
              <Input
                value={statusQuantity}
                onChange={(event) => setStatusQuantity(event.target.value)}
                inputMode="decimal"
                placeholder="10"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Mã lý do đổi trạng thái
            <Input
              value={statusReasonCode}
              onChange={(event) => setStatusReasonCode(event.target.value)}
              placeholder="INV_RELEASE"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ghi chú lý do đổi trạng thái
            <Input
              value={statusReasonNote}
              onChange={(event) => setStatusReasonNote(event.target.value)}
              placeholder="Release sau QC"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Tham chiếu bằng chứng đổi trạng thái
            <textarea
              className="min-h-16 rounded-md border bg-transparent px-3 py-2 text-sm"
              value={statusEvidenceRefs}
              onChange={(event) => setStatusEvidenceRefs(event.target.value)}
              placeholder="qc://result-1"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Khóa idempotency đổi trạng thái
            <Input
              value={statusIdempotencyKey}
              onChange={(event) => setStatusIdempotencyKey(event.target.value)}
              placeholder="status-release-001"
            />
          </label>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={!canChangeStatus || mutations.changeStatus.isPending}
          >
            {mutations.changeStatus.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Ghi nhận đổi trạng thái
          </Button>
          {statusError && (
            <p className="text-destructive text-sm" role="alert">
              {statusError}
            </p>
          )}
        </form>

        <form aria-label="Dịch chuyển nội bộ" className="space-y-3" onSubmit={handleInternalMove}>
          <div className="text-sm font-medium">Dịch chuyển nội bộ</div>
          <label className="grid gap-1 text-sm">
            ID số dư nguồn dịch chuyển
            <Input
              value={moveSourceBalanceId}
              onChange={(event) => setMoveSourceBalanceId(event.target.value)}
              placeholder="balance-source"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              ID vị trí đích
              <Input
                value={targetLocationId}
                onChange={(event) => setTargetLocationId(event.target.value)}
                placeholder="location-target"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Số lượng dịch chuyển
              <Input
                value={moveQuantity}
                onChange={(event) => setMoveQuantity(event.target.value)}
                inputMode="decimal"
                placeholder="10"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Mã lý do dịch chuyển
            <Input
              value={moveReasonCode}
              onChange={(event) => setMoveReasonCode(event.target.value)}
              placeholder="INTERNAL_MOVE"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ghi chú lý do dịch chuyển
            <Input
              value={moveReasonNote}
              onChange={(event) => setMoveReasonNote(event.target.value)}
              placeholder="Dịch chuyển sang pick face"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Tham chiếu bằng chứng dịch chuyển
            <textarea
              className="min-h-16 rounded-md border bg-transparent px-3 py-2 text-sm"
              value={moveEvidenceRefs}
              onChange={(event) => setMoveEvidenceRefs(event.target.value)}
              placeholder="move://work-1"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Khóa idempotency dịch chuyển
            <Input
              value={moveIdempotencyKey}
              onChange={(event) => setMoveIdempotencyKey(event.target.value)}
              placeholder="internal-move-001"
            />
          </label>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={!canMoveInternal || mutations.moveInternal.isPending}
          >
            {mutations.moveInternal.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="size-4" />
            )}
            Ghi nhận dịch chuyển nội bộ
          </Button>
          {moveError && (
            <p className="text-destructive text-sm" role="alert">
              {moveError}
            </p>
          )}
        </form>

        {latestResult && (
          <div>
            <ResultPanel result={latestResult} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
