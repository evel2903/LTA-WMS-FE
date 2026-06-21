import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import {
  inventoryStatusFormSchema,
  type InventoryStatusFormValues,
} from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusFormSchema';

interface InventoryStatusFormProps {
  status: InventoryStatus;
  disabled?: boolean;
  pending?: boolean;
  /** Reason/validation/conflict surfaced inline (single-surface, no toast). */
  inlineError?: string;
  onSubmit: (values: InventoryStatusFormValues) => void;
}

/** A read-only identity field (status code / display name / stage group are not edited here). */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <Input value={value} readOnly disabled />
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

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Status code" value={status.statusCode} />
        <ReadOnlyField label="Display name" value={status.displayName} />
      </div>
      <ReadOnlyField label="Stage group" value={status.stageGroup} />

      {/* Single boolean checkboxes — register is reliable here (only groups need controlling). */}
      <fieldset className="grid gap-2 rounded-md border p-3">
        <legend className="text-muted-foreground px-1 text-xs">Behaviour flags</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={disabled} {...form.register('allowsAllocation')} />
            For allocation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={disabled} {...form.register('allowsPick')} />
            For pick
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={disabled} {...form.register('hold')} />
            Hold
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={disabled} {...form.register('isTerminal')} />
            Terminal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={disabled} {...form.register('isMilestone')} />
            Milestone
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          Sort order
          <Input
            type="number"
            min={0}
            disabled={disabled}
            {...form.register('sortOrder', { valueAsNumber: true })}
          />
          {errors.sortOrder && (
            <span className="text-destructive text-xs">{errors.sortOrder.message}</span>
          )}
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('status')}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        Reason code
        <Input
          disabled={disabled}
          placeholder="e.g. RC-MD-UPDATE"
          {...form.register('reasonCode')}
        />
        {errors.reasonCode && (
          <span className="text-destructive text-xs">{errors.reasonCode.message}</span>
        )}
        {inlineError && (
          <span className="text-destructive text-xs" role="alert">
            {inlineError}
          </span>
        )}
      </label>

      <Button type="submit" disabled={disabled || pending}>
        Update inventory status
      </Button>
    </form>
  );
}
