import { Trash2 } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import type { InboundPlanFormLookups } from '@modules/InboundPlan/Presentation/Components/UseInboundPlanFormLookups';

export interface InboundPlanLineDraft {
  id: number;
  // Re-review fix (AC4): only set/rendered when the caller passes showLineNumber (Edit) --
  // Create always numbers by array position at submit time and never sets this.
  lineNumber?: number;
  skuId: string;
  uomId: string;
  expectedQuantity: string;
  externalLineReference: string;
}

// IFB-24 review fix: shared by InboundPlanCreatePage and InboundPlanEditPanel (was duplicated
// JSX in both). Renders only the row grid -- each page keeps its own header/Card
// wrapper and "Thêm dòng" button placement (Create also has an Import Excel button
// there that Edit doesn't need).
export interface InboundPlanLinesEditorProps {
  idPrefix: string;
  lines: InboundPlanLineDraft[];
  onUpdateLine: (id: number, patch: Partial<InboundPlanLineDraft>) => void;
  onRemoveLine: (id: number) => void;
  lookups: InboundPlanFormLookups;
  // Re-review fix (AC4): Edit passes true so a Draft's existing line numbers are shown +
  // editable instead of always being silently renumbered to array position on submit.
  showLineNumber?: boolean;
}

export function InboundPlanLinesEditor({
  idPrefix,
  lines,
  onUpdateLine,
  onRemoveLine,
  lookups,
  showLineNumber = false,
}: InboundPlanLinesEditorProps) {
  return (
    <>
      {lines.map((line, index) => (
        <div
          key={line.id}
          className={`grid gap-3 rounded-md border p-3 ${
            showLineNumber ? 'lg:grid-cols-[0.6fr_1fr_1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_1fr_1fr_1fr_auto]'
          }`}
        >
          {showLineNumber ? (
            <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-line-${line.id}-line-number`}>
              Số dòng
              <Input
                id={`${idPrefix}-line-${line.id}-line-number`}
                name={`lines[${index}].lineNumber`}
                type="number"
                min="1"
                step="1"
                value={line.lineNumber ?? ''}
                onChange={(event) => onUpdateLine(line.id, { lineNumber: Number(event.target.value) })}
              />
            </label>
          ) : null}
          <LookupSelect
            id={`${idPrefix}-line-${line.id}-sku-id`}
            name={`lines[${index}].skuId`}
            label="SKU"
            value={line.skuId}
            placeholder="Chọn SKU"
            options={lookups.skuOptions}
            isLoading={lookups.skuQuery.isLoading}
            isError={lookups.skuQuery.isError}
            emptyMessage="Chưa có SKU active để chọn."
            errorMessage="Không tải được danh sách SKU."
            onChange={(value) => onUpdateLine(line.id, { skuId: value })}
          />
          <LookupSelect
            id={`${idPrefix}-line-${line.id}-uom-id`}
            name={`lines[${index}].uomId`}
            label="Đơn vị tính"
            value={line.uomId}
            placeholder="Chọn đơn vị tính"
            options={lookups.uomOptions}
            isLoading={lookups.uomQuery.isLoading}
            isError={lookups.uomQuery.isError}
            emptyMessage="Chưa có đơn vị tính active để chọn."
            errorMessage="Không tải được danh sách đơn vị tính."
            onChange={(value) => onUpdateLine(line.id, { uomId: value })}
          />
          <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-line-${line.id}-expected-quantity`}>
            Số lượng dự kiến
            <Input
              id={`${idPrefix}-line-${line.id}-expected-quantity`}
              name={`lines[${index}].expectedQuantity`}
              type="number"
              min="0.0001"
              step="any"
              value={line.expectedQuantity}
              onChange={(event) => onUpdateLine(line.id, { expectedQuantity: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-line-${line.id}-external-reference`}>
            Tham chiếu dòng ngoài
            <Input
              id={`${idPrefix}-line-${line.id}-external-reference`}
              name={`lines[${index}].externalLineReference`}
              value={line.externalLineReference}
              onChange={(event) => onUpdateLine(line.id, { externalLineReference: event.target.value })}
              placeholder="10"
            />
          </label>
          <Button
            id={`${idPrefix}-line-${line.id}-remove`}
            name={`lines[${index}].remove`}
            type="button"
            variant="secondary"
            size="icon"
            className="self-end"
            aria-label={`Xóa dòng ${index + 1}`}
            disabled={lines.length === 1}
            onClick={() => onRemoveLine(line.id)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
    </>
  );
}
