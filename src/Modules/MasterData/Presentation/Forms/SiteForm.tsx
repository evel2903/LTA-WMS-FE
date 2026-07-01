import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Site } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  siteFormSchema,
  type SiteFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

interface SiteFormProps {
  initialValue?: Site;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: SiteFormValues) => void;
}

export function SiteForm({
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  onSubmit,
}: SiteFormProps) {
  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      siteCode: initialValue?.siteCode ?? '',
      siteName: initialValue?.siteName ?? '',
      status: initialValue?.status ?? 'Active',
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
      reasonCode: '',
    },
  });
  const reasonCode = form.watch('reasonCode');
  const reasonAction = initialValue ? 'Update' : 'Create';

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">Mã site<Input disabled={disabled} {...form.register('siteCode')} />
        {form.formState.errors.siteCode && (
          <span className="text-destructive text-xs">{form.formState.errors.siteCode.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Tên site<Input disabled={disabled} {...form.register('siteName')} />
        {form.formState.errors.siteName && (
          <span className="text-destructive text-xs">{form.formState.errors.siteName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Trạng thái<select className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled} {...form.register('status')}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
        </select>
      </label>
      <div>
        <ReasonCodeSelect
          id="site-reason-code"
          name="reasonCode"
          label="Mã lý do"
          value={reasonCode}
          action={reasonAction}
          objectType="Site"
          disabled={disabled}
          onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
        />
        {form.formState.errors.reasonCode && (
          <span className="text-destructive text-xs">{form.formState.errors.reasonCode.message}</span>
        )}
      </div>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
