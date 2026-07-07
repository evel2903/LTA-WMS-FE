import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  inventoryStatusFormSchema,
  type InventoryStatusFormValues,
} from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusFormSchema';
import { masterDataStatusLabel } from '@modules/InventoryStatus/Presentation/Constants/InventoryStatusDisplayText';

interface InventoryStatusFormProps {
  status: InventoryStatus;
  disabled?: boolean;
  pending?: boolean;
  /** Reason/validation/conflict surfaced inline (single-surface, no toast). */
  inlineError?: string;
  onSubmit: (values: InventoryStatusFormValues) => void;
}

/** A read-only identity field (status code / display name / stage group are not edited here). */
function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      {label}
      <Input id={id} name={id} value={value} readOnly disabled />
    </label>
  );
}

export function InventoryStatusForm({
  status,
  disabled = false,
  pending = false,
  inlineError,
  onSubmit,
}: InventoryStatusFormProps) {
  const form = useForm<InventoryStatusFormValues>({
    resolver: zodResolver(inventoryStatusFormSchema),
    defaultValues: {
      allowsAllocation: status.allowsAllocation,
      allowsPick: status.allowsPick,
      hold: status.hold,
      isTerminal: status.isTerminal,
      isMilestone: status.isMilestone,
      sortOrder: status.sortOrder,
      status: status.status,
      // Always re-entered per change — never carried over from a previous edit.
      reasonCode: '',
    },
  });
  const errors = form.formState.errors;
  const reasonCode = form.watch('reasonCode');

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ReadOnlyField id="inventory-status-code" label="Mã trạng thái" value={status.statusCode} />
        <ReadOnlyField id="inventory-status-display-name" label="Tên hiển thị" value={status.displayName} />
      </div>
      <ReadOnlyField id="inventory-status-stage-group" label="Nhóm chặng" value={status.stageGroup} />

      {/* Single boolean checkboxes — register is reliable here (only groups need controlling). */}
      <fieldset className="grid gap-2 rounded-md border p-3">
        <legend className="text-muted-foreground px-1 text-xs">Cờ hành vi</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input id="inventory-status-allows-allocation" type="checkbox" disabled={disabled} {...form.register('allowsAllocation')} />Cho phân bổ</label>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input id="inventory-status-allows-pick" type="checkbox" disabled={disabled} {...form.register('allowsPick')} />Cho lấy hàng</label>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input id="inventory-status-hold" type="checkbox" disabled={disabled} {...form.register('hold')} />Tạm giữ</label>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input id="inventory-status-terminal" type="checkbox" disabled={disabled} {...form.register('isTerminal')} />Kết thúc</label>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input id="inventory-status-milestone" type="checkbox" disabled={disabled} {...form.register('isMilestone')} />Mốc nghiệp vụ</label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Thứ tự sắp xếp<Input
            id="inventory-status-sort-order"
            type="number"
            min={0}
            disabled={disabled}
            {...form.register('sortOrder', { valueAsNumber: true })}
          />
          {errors.sortOrder && (
            <span className="text-destructive text-xs">{errors.sortOrder.message}</span>
          )}
        </label>
        <label className="grid gap-1 text-sm">Trạng thái<select
            id="inventory-status-status"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('status')}
          >
            <option value="Active">{masterDataStatusLabel('Active')}</option>
            <option value="Inactive">{masterDataStatusLabel('Inactive')}</option>
          </select>
        </label>
      </div>

      <div>
        <ReasonCodeSelect
          id="inventory-status-reason-code"
          name="reasonCode"
          label="Mã lý do thay đổi"
          value={reasonCode}
          action="Update"
          objectType="InventoryStatus"
          disabled={disabled}
          onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
        />
        {errors.reasonCode && (
          <span className="text-destructive text-xs">{errors.reasonCode.message}</span>
        )}
      </div>
      {inlineError && (
        <Alert variant="destructive" role="alert" className="w-full">
          <AlertDescription>{inlineError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={disabled || pending}>
        Cập nhật trạng thái tồn kho
      </Button>
    </form>
  );
}
