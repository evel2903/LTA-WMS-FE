import { zodResolver } from '@hookform/resolvers/zod';
import { ArchiveX } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  locationProfileFormSchema,
  locationProfileToFormValues,
  type LocationProfileFormValues,
} from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';

interface LocationProfileFormProps {
  mode: 'create' | 'edit';
  initialValue?: LocationProfile;
  disabled?: boolean;
  pending?: boolean;
  inlineError?: string;
  onSubmit: (values: LocationProfileFormValues) => void;
  onInactivate?: (values: LocationProfileFormValues) => void;
}

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="text-destructive text-xs">{message}</span> : null;
}

function PolicyTextarea({
  label,
  disabled,
  registration,
  error,
}: {
  label: string;
  disabled: boolean;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <textarea
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 rounded-md border bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        {...registration}
      />
      <ErrorText message={error} />
    </label>
  );
}

export function LocationProfileForm({
  mode,
  initialValue,
  disabled = false,
  pending = false,
  inlineError,
  onSubmit,
  onInactivate,
}: LocationProfileFormProps) {
  const form = useForm<LocationProfileFormValues>({
    resolver: zodResolver(locationProfileFormSchema),
    defaultValues: locationProfileToFormValues(initialValue),
  });
  const errors = form.formState.errors;

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      {mode === 'edit' ? (
        <input type="hidden" {...form.register('version', { valueAsNumber: true })} />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Profile code
          <Input disabled={disabled || mode === 'edit'} {...form.register('profileCode')} />
          <ErrorText message={errors.profileCode?.message} />
        </label>
        <label className="grid gap-1 text-sm">
          Profile name
          <Input disabled={disabled} {...form.register('profileName')} />
          <ErrorText message={errors.profileName?.message} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Location type
          <Input disabled={disabled} {...form.register('locationType')} />
          <ErrorText message={errors.locationType?.message} />
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

      <div className="grid gap-3 md:grid-cols-2">
        <PolicyTextarea
          label="Capacity policy"
          disabled={disabled}
          registration={form.register('capacityPolicyJson')}
          error={errors.capacityPolicyJson?.message}
        />
        <PolicyTextarea
          label="Eligibility policy"
          disabled={disabled}
          registration={form.register('eligibilityPolicyJson')}
          error={errors.eligibilityPolicyJson?.message}
        />
        <PolicyTextarea
          label="Mix policy"
          disabled={disabled}
          registration={form.register('mixPolicyJson')}
          error={errors.mixPolicyJson?.message}
        />
        <PolicyTextarea
          label="Compliance policy"
          disabled={disabled}
          registration={form.register('compliancePolicyJson')}
          error={errors.compliancePolicyJson?.message}
        />
        <PolicyTextarea
          label="Operation policy"
          disabled={disabled}
          registration={form.register('operationPolicyJson')}
          error={errors.operationPolicyJson?.message}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Reason code
          <Input
            disabled={disabled}
            placeholder="e.g. RC-MD-UPDATE"
            {...form.register('reasonCode')}
          />
          <ErrorText message={errors.reasonCode?.message} />
          {inlineError && (
            <span className="text-destructive text-xs" role="alert">
              {inlineError}
            </span>
          )}
        </label>
        <label className="grid gap-1 text-sm">
          Source system
          <Input disabled={disabled} {...form.register('sourceSystem')} />
        </label>
        <label className="grid gap-1 text-sm">
          Reference id
          <Input disabled={disabled} {...form.register('referenceId')} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled || pending}>
          {mode === 'create' ? 'Create profile' : 'Update profile'}
        </Button>
        {mode === 'edit' && initialValue?.status === 'Active' && onInactivate ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || pending}
            onClick={form.handleSubmit(onInactivate)}
          >
            <ArchiveX className="size-4" />
            Inactivate profile
          </Button>
        ) : null}
      </div>
    </form>
  );
}
