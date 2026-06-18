import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import {
  assignmentFormSchema,
  type AssignmentFormValues,
} from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';

interface AssignmentFormProps {
  disabled?: boolean;
  pending?: boolean;
  conflict?: string;
  onSubmit: (values: AssignmentFormValues) => void;
}

export function AssignmentForm({ disabled = false, pending = false, conflict, onSubmit }: AssignmentFormProps) {
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: { assignmentType: 'WAREHOUSE_TYPE', warehouseTypeCode: '', warehouseId: '' },
  });
  const assignmentType = form.watch('assignmentType');
  const errors = form.formState.errors;

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        Assignment type
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('assignmentType')}
        >
          <option value="WAREHOUSE_TYPE">Warehouse type</option>
          <option value="WAREHOUSE">Warehouse</option>
        </select>
      </label>

      {assignmentType === 'WAREHOUSE_TYPE' ? (
        <label className="grid gap-1 text-sm">
          Warehouse type code
          <Input disabled={disabled} {...form.register('warehouseTypeCode')} />
          {errors.warehouseTypeCode && (
            <span className="text-destructive text-xs">{errors.warehouseTypeCode.message}</span>
          )}
        </label>
      ) : (
        <label className="grid gap-1 text-sm">
          Warehouse ID
          <Input disabled={disabled} {...form.register('warehouseId')} />
          {errors.warehouseId && (
            <span className="text-destructive text-xs">{errors.warehouseId.message}</span>
          )}
        </label>
      )}

      {conflict && (
        <span className="text-destructive text-xs" role="alert">
          {conflict}
        </span>
      )}
      <Button type="submit" disabled={disabled || pending}>
        Add assignment
      </Button>
    </form>
  );
}
