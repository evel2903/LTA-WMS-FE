import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { SKU_STATUSES } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { Owner, Sku, Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  skuFormSchema,
  type SkuFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';
import {
  SKU_CONTROL_FLAG_LABELS,
  displaySkuStatus,
} from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import { mergeSelectedOption } from '@modules/MasterData/Presentation/Forms/SelectOptions';

const SKU_STATUS_OPTIONS = SKU_STATUSES.map((value) => ({ value, label: displaySkuStatus(value) }));

interface SkuFormProps {
  initialValue?: Sku;
  owners: Owner[];
  uoms: Uom[];
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  missingSetupMessages?: string[];
  showSubmit?: boolean;
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
  missingSetupMessages,
  showSubmit = true,
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
  const itemStatus = form.watch('itemStatus');
  const { ref: itemStatusRef } = form.register('itemStatus');
  const baseUomId = form.watch('baseUomId');
  const { ref: baseUomIdRef } = form.register('baseUomId');
  const inventoryUomId = form.watch('inventoryUomId');
  const { ref: inventoryUomIdRef } = form.register('inventoryUomId');
  const defaultOwnerId = form.watch('defaultOwnerId');
  const { ref: defaultOwnerIdRef } = form.register('defaultOwnerId');

  const uomOptions = uoms.map((uom) => ({ value: uom.id, label: `${uom.uomCode} - ${uom.uomName}` }));
  const ownerOptions = owners.map((owner) => ({
    value: owner.id,
    label: `${owner.ownerCode} - ${owner.ownerName}`,
  }));
  const baseUomOptions = mergeSelectedOption(uomOptions, initialValue?.baseUomId);
  const inventoryUomOptions = mergeSelectedOption(uomOptions, initialValue?.inventoryUomId);
  const defaultOwnerOptions = mergeSelectedOption(ownerOptions, initialValue?.defaultOwnerId);
  const setupMessages = missingSetupMessages ?? [];

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      {setupMessages.length > 0 ? (
        <Alert role="status" variant="warning">
          <AlertDescription>
            <span className="font-medium">Thiếu cấu hình SKU</span>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {setupMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <label className="grid gap-1 text-sm">Mã SKU<Input disabled={disabled} {...form.register('skuCode')} />
        {errors.skuCode && <span className="text-destructive text-xs">{errors.skuCode.message}</span>}
      </label>
      {conflict && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
      <label className="grid gap-1 text-sm">Tên SKU<Input disabled={disabled} {...form.register('skuName')} />
        {errors.skuName && <span className="text-destructive text-xs">{errors.skuName.message}</span>}
      </label>
      <label className="grid gap-1 text-sm">Nhóm hàng<Input disabled={disabled} {...form.register('itemClass')} />
        {errors.itemClass && (
          <span className="text-destructive text-xs">{errors.itemClass.message}</span>
        )}
      </label>
      <ComboboxSelect
        ref={itemStatusRef}
        id="sku-item-status"
        name="itemStatus"
        label="Trạng thái hàng"
        value={itemStatus}
        placeholder="Chọn trạng thái"
        options={SKU_STATUS_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          form.setValue('itemStatus', value as SkuFormValues['itemStatus'], {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      <div className="grid gap-1">
        <ComboboxSelect
          ref={baseUomIdRef}
          id="sku-base-uom"
          name="baseUomId"
          label="Đơn vị tính cơ sở"
          value={baseUomId}
          placeholder="Chọn đơn vị tính"
          options={baseUomOptions}
          disabled={disabled}
          onChange={(value) =>
            form.setValue('baseUomId', value, { shouldDirty: true, shouldValidate: true })
          }
        />
        {errors.baseUomId && (
          <span className="text-destructive text-xs">{errors.baseUomId.message}</span>
        )}
      </div>
      <div className="grid gap-1">
        <ComboboxSelect
          ref={inventoryUomIdRef}
          id="sku-inventory-uom"
          name="inventoryUomId"
          label="Đơn vị tính tồn kho"
          value={inventoryUomId}
          placeholder="Chọn đơn vị tính"
          options={inventoryUomOptions}
          disabled={disabled}
          onChange={(value) =>
            form.setValue('inventoryUomId', value, { shouldDirty: true, shouldValidate: true })
          }
        />
        {errors.inventoryUomId && (
          <span className="text-destructive text-xs">{errors.inventoryUomId.message}</span>
        )}
      </div>
      <div className="grid gap-1">
        <ComboboxSelect
          ref={defaultOwnerIdRef}
          id="sku-default-owner"
          name="defaultOwnerId"
          label="Chủ hàng mặc định"
          // `defaultOwnerId` is typed `string | undefined` because the Zod schema wraps
          // it in `optionalText` (preprocess '' -> undefined for validation), but at
          // runtime this field is always seeded with '' and only ever set to a real
          // string via ComboboxSelect's own onChange -- coerce the type here rather than
          // touching the shared schema.
          value={defaultOwnerId ?? ''}
          placeholder="Không chọn"
          optional
          options={defaultOwnerOptions}
          disabled={disabled}
          onChange={(value) =>
            form.setValue('defaultOwnerId', value, { shouldDirty: true, shouldValidate: true })
          }
        />
        {errors.defaultOwnerId && (
          <span className="text-destructive text-xs">{errors.defaultOwnerId.message}</span>
        )}
      </div>

      <fieldset className="grid gap-2 rounded-md border p-3 text-sm">
        <legend className="px-1 font-medium">Cờ kiểm soát</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(SKU_CONTROL_FLAG_LABELS) as Array<[
            keyof typeof SKU_CONTROL_FLAG_LABELS,
            string,
          ]>).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" disabled={disabled} {...form.register(key)} />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={disabled} {...form.register('bondedFlag')} />Cờ kho ngoại quan</label>
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm">Nhóm nhiệt độ<Input disabled={disabled} {...form.register('temperatureClass')} />
        {errors.temperatureClass && (
          <span className="text-destructive text-xs">{errors.temperatureClass.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Nhóm hàng nguy hiểm<Input disabled={disabled} {...form.register('dgClass')} />
        {errors.dgClass && <span className="text-destructive text-xs">{errors.dgClass.message}</span>}
      </label>
      <label className="grid gap-1 text-sm">Hạn sử dụng (ngày)<Input type="number" min={0} disabled={disabled} {...form.register('shelfLifeDays')} />
        {errors.shelfLifeDays && (
          <span className="text-destructive text-xs">{errors.shelfLifeDays.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Hạn sử dụng còn lại tối thiểu (ngày)<Input
          type="number"
          min={0}
          disabled={disabled}
          {...form.register('minRemainingShelfLifeDays')}
        />
      </label>

      {showSubmit ? (
        <Button type="submit" disabled={disabled || pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
