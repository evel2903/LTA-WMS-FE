import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { SKU_CONTROL_FLAGS, SKU_STATUSES } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { Owner, Sku, Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  skuFormSchema,
  type SkuFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';
import { mergeSelectedOption } from '@modules/MasterData/Presentation/Forms/SelectOptions';

interface SkuFormProps {
  initialValue?: Sku;
  owners: Owner[];
  uoms: Uom[];
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  /** Inline 409-conflict message surfaced next to the code field (AC3). */
  conflict?: string;
  onSubmit: (values: SkuFormValues) => void;
}

export function SkuForm({
  initialValue,
  owners,
  uoms,
  disabled = false,
  pending = false,
  submitLabel,
  conflict,
  onSubmit,
}: SkuFormProps) {
  const form = useForm<SkuFormValues>({
    resolver: zodResolver(skuFormSchema),
    defaultValues: {
      skuCode: initialValue?.skuCode ?? '',
      skuName: initialValue?.skuName ?? '',
      itemClass: initialValue?.itemClass ?? '',
      itemStatus: initialValue?.itemStatus ?? 'Draft',
      baseUomId: initialValue?.baseUomId ?? '',
      inventoryUomId: initialValue?.inventoryUomId ?? '',
      defaultOwnerId: initialValue?.defaultOwnerId ?? '',
      lotControlled: initialValue?.lotControlled ?? false,
      expiryControlled: initialValue?.expiryControlled ?? false,
      serialControlled: initialValue?.serialControlled ?? false,
      ownerControlled: initialValue?.ownerControlled ?? false,
      lpnControlled: initialValue?.lpnControlled ?? false,
      temperatureControlled: initialValue?.temperatureControlled ?? false,
      dgControlled: initialValue?.dgControlled ?? false,
      customsControlled: initialValue?.customsControlled ?? false,
      qcRequired: initialValue?.qcRequired ?? false,
      bondedFlag: initialValue?.bondedFlag ?? false,
      temperatureClass: initialValue?.temperatureClass ?? '',
      dgClass: initialValue?.dgClass ?? '',
      shelfLifeDays: (initialValue?.shelfLifeDays ?? '') as unknown as number,
      minRemainingShelfLifeDays: (initialValue?.minRemainingShelfLifeDays ?? '') as unknown as number,
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
    },
  });
  const errors = form.formState.errors;

  const uomOptions = uoms.map((uom) => ({ value: uom.id, label: `${uom.uomCode} - ${uom.uomName}` }));
  const ownerOptions = owners.map((owner) => ({
    value: owner.id,
    label: `${owner.ownerCode} - ${owner.ownerName}`,
  }));
  const baseUomOptions = mergeSelectedOption(uomOptions, initialValue?.baseUomId);
  const inventoryUomOptions = mergeSelectedOption(uomOptions, initialValue?.inventoryUomId);
  const defaultOwnerOptions = mergeSelectedOption(ownerOptions, initialValue?.defaultOwnerId);

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        SKU code
        <Input disabled={disabled} {...form.register('skuCode')} />
        {errors.skuCode && <span className="text-destructive text-xs">{errors.skuCode.message}</span>}
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        SKU name
        <Input disabled={disabled} {...form.register('skuName')} />
        {errors.skuName && <span className="text-destructive text-xs">{errors.skuName.message}</span>}
      </label>
      <label className="grid gap-1 text-sm">
        Item class
        <Input disabled={disabled} {...form.register('itemClass')} />
        {errors.itemClass && (
          <span className="text-destructive text-xs">{errors.itemClass.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Item status
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('itemStatus')}
        >
          {SKU_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Base UOM
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('baseUomId')}
        >
          <option value="">Select UOM</option>
          {baseUomOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.baseUomId && (
          <span className="text-destructive text-xs">{errors.baseUomId.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Inventory UOM
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('inventoryUomId')}
        >
          <option value="">Select UOM</option>
          {inventoryUomOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.inventoryUomId && (
          <span className="text-destructive text-xs">{errors.inventoryUomId.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Default owner
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('defaultOwnerId')}
        >
          <option value="">None</option>
          {defaultOwnerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.defaultOwnerId && (
          <span className="text-destructive text-xs">{errors.defaultOwnerId.message}</span>
        )}
      </label>

      <fieldset className="grid gap-2 rounded-md border p-3 text-sm">
        <legend className="px-1 font-medium">Control flags</legend>
        <div className="grid grid-cols-2 gap-2">
          {SKU_CONTROL_FLAGS.map((flag) => (
            <label key={flag.key} className="flex items-center gap-2">
              <input type="checkbox" disabled={disabled} {...form.register(flag.key)} />
              {flag.label}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={disabled} {...form.register('bondedFlag')} />
            Bonded flag
          </label>
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm">
        Temperature class
        <Input disabled={disabled} {...form.register('temperatureClass')} />
        {errors.temperatureClass && (
          <span className="text-destructive text-xs">{errors.temperatureClass.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        DG class
        <Input disabled={disabled} {...form.register('dgClass')} />
        {errors.dgClass && <span className="text-destructive text-xs">{errors.dgClass.message}</span>}
      </label>
      <label className="grid gap-1 text-sm">
        Shelf life (days)
        <Input type="number" min={0} disabled={disabled} {...form.register('shelfLifeDays')} />
        {errors.shelfLifeDays && (
          <span className="text-destructive text-xs">{errors.shelfLifeDays.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Min remaining shelf life (days)
        <Input
          type="number"
          min={0}
          disabled={disabled}
          {...form.register('minRemainingShelfLifeDays')}
        />
      </label>

      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
