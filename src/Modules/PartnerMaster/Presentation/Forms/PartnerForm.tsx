import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { PARTNER_STATUSES, PARTNER_TYPES } from '@modules/PartnerMaster/Domain/Constants/PartnerConstants';
import type { Partner } from '@modules/PartnerMaster/Domain/Types/Partner';
import {
  displayPartnerStatus,
  displayPartnerType,
} from '@modules/PartnerMaster/Presentation/Constants/PartnerDisplayText';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  partnerDeactivateSchema,
  partnerFormSchema,
  type PartnerDeactivateValues,
  type PartnerFormValues,
} from '@modules/PartnerMaster/Presentation/Forms/PartnerFormSchema';

interface PartnerFormProps {
  initialValue?: Partner;
  disabled?: boolean;
  pending?: boolean;
  deactivatePending?: boolean;
  submitLabel: string;
  partnerTypeEditable?: boolean;
  conflict?: string;
  onSubmit: (values: PartnerFormValues) => void;
  onDeactivate?: (values: PartnerDeactivateValues) => void;
}

export function PartnerForm({
  initialValue,
  disabled = false,
  pending = false,
  deactivatePending = false,
  submitLabel,
  partnerTypeEditable = true,
  conflict,
  onSubmit,
  onDeactivate,
}: PartnerFormProps) {
  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      partnerCode: initialValue?.partnerCode ?? '',
      partnerName: initialValue?.partnerName ?? '',
      partnerType: initialValue?.partnerType ?? 'Supplier',
      status: initialValue?.status ?? 'Active',
      sourceSystem: initialValue?.sourceSystem ?? '',
      externalReference: initialValue?.externalReference ?? '',
      referenceText: initialValue?.referenceText ?? '',
    },
  });
  const deactivateForm = useForm<PartnerDeactivateValues>({
    resolver: zodResolver(partnerDeactivateSchema),
    defaultValues: { reasonCode: '' },
  });
  const deactivateReasonCode = deactivateForm.watch('reasonCode');
  const partnerTypeValue = form.watch('partnerType');

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <label className="grid gap-1 text-sm">Mã đối tác<Input disabled={disabled} {...form.register('partnerCode')} />
        {form.formState.errors.partnerCode && (
          <span className="text-destructive text-xs">{form.formState.errors.partnerCode.message}</span>
        )}
      </label>
      {conflict && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
      <label className="grid gap-1 text-sm">Tên đối tác<Input disabled={disabled} {...form.register('partnerName')} />
        {form.formState.errors.partnerName && (
          <span className="text-destructive text-xs">{form.formState.errors.partnerName.message}</span>
        )}
      </label>
      {partnerTypeEditable ? (
        <label className="grid gap-1 text-sm">Loại đối tác<select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('partnerType')}
          >
            {PARTNER_TYPES.map((type) => (
              <option key={type} value={type}>
                {displayPartnerType(type)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid gap-1 text-sm">
          <span>Loại đối tác</span>
          <input type="hidden" {...form.register('partnerType')} />
          <p className="border-border bg-muted text-foreground rounded-md border px-3 py-2">
            {displayPartnerType(partnerTypeValue)}
          </p>
        </div>
      )}
      <label className="grid gap-1 text-sm">Trạng thái<select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('status')}
        >
          {PARTNER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {displayPartnerStatus(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Hệ thống nguồn<Input disabled={disabled} {...form.register('sourceSystem')} />
        {form.formState.errors.sourceSystem && (
          <span className="text-destructive text-xs">{form.formState.errors.sourceSystem.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Tham chiếu ngoài<Input disabled={disabled} {...form.register('externalReference')} />
        {form.formState.errors.externalReference && (
          <span className="text-destructive text-xs">
            {form.formState.errors.externalReference.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Nội dung tham chiếu<Input disabled={disabled} {...form.register('referenceText')} />
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
      {onDeactivate && (
        <div className="border-t pt-3">
          <div>
            <ReasonCodeSelect
              id="partner-deactivate-reason-code"
              name="reasonCode"
              label="Mã lý do"
              value={deactivateReasonCode}
              action="DeleteCancel"
              objectType="Partner"
              disabled={disabled}
              onChange={(value) =>
                deactivateForm.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })
              }
            />
            {deactivateForm.formState.errors.reasonCode && (
              <span className="text-destructive text-xs">
                {deactivateForm.formState.errors.reasonCode.message}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={disabled || deactivatePending}
            onClick={deactivateForm.handleSubmit(onDeactivate)}
          >Ngưng kích hoạt đối tác</Button>
        </div>
      )}
    </form>
  );
}
