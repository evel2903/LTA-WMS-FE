import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { InboundPlanLinesEditor } from '@modules/Inbound/Presentation/Components/InboundPlanLinesEditor';
import type { InboundPlanLineDraft } from '@modules/Inbound/Presentation/Components/InboundPlanLinesEditor';
import { InboundPlanScopeFields } from '@modules/Inbound/Presentation/Components/InboundPlanScopeFields';
import { InboundPlanTextFields } from '@modules/Inbound/Presentation/Components/InboundPlanTextFields';
import { useInboundPlanFormLookups } from '@modules/Inbound/Presentation/Components/UseInboundPlanFormLookups';
import type { InboundPlan } from '@modules/Inbound/Domain/Types/InboundPlan';
import type { UpdateInboundPlanInput } from '@modules/Inbound/Domain/Types/InboundPlanQuery';

let nextDraftLineId = 0;

function toDraftLines(plan: InboundPlan): InboundPlanLineDraft[] {
  return plan.lines.map((line) => ({
    id: (nextDraftLineId += 1),
    // Re-review fix (AC4): preserve the plan's real LineNumber instead of letting submit
    // silently renumber it to array position -- see handleSubmit below.
    lineNumber: line.lineNumber,
    skuId: line.skuId,
    uomId: line.uomId,
    expectedQuantity: String(line.expectedQuantity),
    externalLineReference: line.externalLineReference ?? '',
  }));
}

function nextLineNumber(lines: InboundPlanLineDraft[]): number {
  return lines.reduce((max, line) => Math.max(max, line.lineNumber ?? 0), 0) + 1;
}

// Re-review fix: the "Số dòng" input has no client-side guard -- a cleared, non-positive,
// or duplicate value would only ever get caught by the backend's AssertValidInboundPlanLines,
// after a round-trip. Mirrors that same rule set client-side so canSubmit can block it instead.
function hasValidLineNumbers(lines: InboundPlanLineDraft[]): boolean {
  const seen = new Set<number>();
  for (const line of lines) {
    if (!Number.isInteger(line.lineNumber) || (line.lineNumber as number) < 1) return false;
    if (seen.has(line.lineNumber as number)) return false;
    seen.add(line.lineNumber as number);
  }
  return true;
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface InboundEditPanelProps {
  plan: InboundPlan;
  isPending: boolean;
  errorMessage: string | null;
  onSubmit: (input: UpdateInboundPlanInput) => void;
  onCancel: () => void;
}

// IFB-24 review fix: header/scope fields and the line editor are now the SAME shared
// components InboundCreatePage renders (InboundPlanTextFields/ScopeFields/LinesEditor +
// useInboundPlanFormLookups) instead of duplicated JSX/query logic -- this panel only
// owns its own form state, pre-filled from `plan`, and the Draft-only submit/cancel wiring.
export function InboundEditPanel({ plan, isPending, errorMessage, onSubmit, onCancel }: InboundEditPanelProps) {
  const lookups = useInboundPlanFormLookups();

  const [sourceSystem, setSourceSystem] = useState(plan.sourceSystem);
  const [sourceDocumentType, setSourceDocumentType] = useState(plan.sourceDocumentType);
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState(plan.sourceDocumentNumber);
  const [supplierId, setSupplierId] = useState(plan.supplierId);
  const [ownerId, setOwnerId] = useState(plan.ownerId);
  const [warehouseId, setWarehouseId] = useState(plan.warehouseId);
  const [warehouseProfileId, setWarehouseProfileId] = useState(plan.warehouseProfileId ?? '');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState(toDateTimeLocal(plan.expectedArrivalAt));
  const [lineDrafts, setLineDrafts] = useState<InboundPlanLineDraft[]>(() => toDraftLines(plan));

  const canSubmit = Boolean(
    sourceSystem.trim() &&
      sourceDocumentNumber.trim() &&
      supplierId.trim() &&
      ownerId.trim() &&
      warehouseId.trim() &&
      // Re-review fix: `[].every(...)` is vacuously true, so a Draft that somehow has zero
      // lines (e.g. legacy data) could enable submit and send an empty lines array that the
      // backend then has to reject -- require at least one line client-side too.
      lineDrafts.length > 0 &&
      hasValidLineNumbers(lineDrafts) &&
      lineDrafts.every(
        (line) => line.skuId.trim() && line.uomId.trim() && Number(line.expectedQuantity) > 0,
      ),
  );

  function updateLine(id: number, patch: Partial<InboundPlanLineDraft>) {
    setLineDrafts((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: number) {
    setLineDrafts((lines) => (lines.length === 1 ? lines : lines.filter((line) => line.id !== id)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      sourceSystem: sourceSystem.trim(),
      sourceDocumentType: sourceDocumentType.trim() || 'ASN',
      sourceDocumentNumber: sourceDocumentNumber.trim(),
      supplierId: supplierId.trim(),
      ownerId: ownerId.trim(),
      warehouseId: warehouseId.trim(),
      warehouseProfileId: warehouseProfileId.trim() || null,
      expectedArrivalAt: expectedArrivalAt ? new Date(expectedArrivalAt).toISOString() : null,
      // Re-review fix (P1 decision): echo back the updatedAt this form was seeded from --
      // the backend 409s if the plan has moved on since, instead of silently overwriting
      // a concurrent editor's just-saved changes (last-write-wins).
      expectedUpdatedAt: plan.updatedAt,
      lines: lineDrafts.map((line, index) => ({
        // Re-review fix (AC4): preserve/use the edited LineNumber instead of always
        // overwriting it to array position -- the `?? index + 1` fallback only applies to a
        // freshly-added line whose number input is still empty.
        lineNumber: line.lineNumber ?? index + 1,
        skuId: line.skuId.trim(),
        uomId: line.uomId.trim(),
        expectedQuantity: Number(line.expectedQuantity),
        externalLineReference: line.externalLineReference.trim() || null,
      })),
    });
  }

  return (
    <Card data-testid="inbound-edit-panel">
      <CardHeader>
        <CardTitle className="text-base">Sửa kế hoạch nhập kho</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <InboundPlanTextFields
            idPrefix="inbound-edit"
            sourceSystem={sourceSystem}
            onSourceSystemChange={setSourceSystem}
            sourceDocumentType={sourceDocumentType}
            onSourceDocumentTypeChange={setSourceDocumentType}
            sourceDocumentNumber={sourceDocumentNumber}
            onSourceDocumentNumberChange={setSourceDocumentNumber}
            expectedArrivalAt={expectedArrivalAt}
            onExpectedArrivalAtChange={setExpectedArrivalAt}
          />

          <InboundPlanScopeFields
            idPrefix="inbound-edit"
            supplierId={supplierId}
            onSupplierIdChange={setSupplierId}
            ownerId={ownerId}
            onOwnerIdChange={setOwnerId}
            warehouseId={warehouseId}
            onWarehouseIdChange={setWarehouseId}
            warehouseProfileId={warehouseProfileId}
            onWarehouseProfileIdChange={setWarehouseProfileId}
            lookups={lookups}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dòng hàng dự kiến</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setLineDrafts((lines) => [
                    ...lines,
                    {
                      id: (nextDraftLineId += 1),
                      lineNumber: nextLineNumber(lines),
                      skuId: '',
                      uomId: '',
                      expectedQuantity: '1',
                      externalLineReference: '',
                    },
                  ])
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Thêm dòng
              </Button>
            </div>
            <InboundPlanLinesEditor
              idPrefix="inbound-edit"
              lines={lineDrafts}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
              lookups={lookups}
              showLineNumber
            />
          </div>

          {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}

          <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
