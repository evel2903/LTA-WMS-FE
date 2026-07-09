import { zodResolver } from '@hookform/resolvers/zod';
import { ArchiveX } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
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
  const reasonCode = form.watch('reasonCode') ?? '';

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      {mode === 'edit' ? (
        <input type="hidden" {...form.register('version', { valueAsNumber: true })} />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">Mã hồ sơ<Input disabled={disabled || mode === 'edit'} {...form.register('profileCode')} />
          <ErrorText message={errors.profileCode?.message} />
        </label>
        <label className="grid gap-1 text-sm">Tên hồ sơ<Input disabled={disabled} {...form.register('profileName')} />
          <ErrorText message={errors.profileName?.message} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">Loại vị trí<Input disabled={disabled} {...form.register('locationType')} />
          <ErrorText message={errors.locationType?.message} />
        </label>
        <label className="grid gap-1 text-sm">Trạng thái<select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('status')}
          >
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Không hoạt động</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <fieldset className="grid gap-2 rounded-md border p-3">
          <legend className="text-muted-foreground px-1 text-xs">Chính sách sức chứa</legend>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input
              id="location-profile-require-capacity-qty"
              type="checkbox"
              disabled={disabled}
              {...form.register('requireCapacityQty')}
            />
            Yêu cầu số lượng sức chứa
          </label>
        </fieldset>

        <fieldset className="grid gap-2 rounded-md border p-3">
          <legend className="text-muted-foreground px-1 text-xs">Chính sách điều kiện sử dụng</legend>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input
              id="location-profile-eligibility-putaway-blocked"
              type="checkbox"
              disabled={disabled}
              {...form.register('eligibilityPutawayBlocked')}
            />
            Chặn putaway (điều kiện sử dụng)
          </label>
        </fieldset>

        <fieldset className="grid gap-2 rounded-md border p-3">
          <legend className="text-muted-foreground px-1 text-xs">Chính sách trộn hàng</legend>
          <label className="grid gap-1 text-sm">Trộn SKU<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              disabled={disabled}
              {...form.register('mixSkuPolicy')}
            >
              <option value="allow">Cho phép trộn</option>
              <option value="noMix">Không trộn</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Trộn chủ hàng<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              disabled={disabled}
              {...form.register('mixOwnerPolicy')}
            >
              <option value="allow">Cho phép trộn</option>
              <option value="noMix">Không trộn</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Trộn lô<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              disabled={disabled}
              {...form.register('mixLotPolicy')}
            >
              <option value="allow">Cho phép trộn</option>
              <option value="noMix">Không trộn</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="grid gap-2 rounded-md border p-3">
          <legend className="text-muted-foreground px-1 text-xs">Chính sách tuân thủ</legend>
          <label className="grid gap-1 text-sm">Nhóm nhiệt độ yêu cầu<Input disabled={disabled} {...form.register('requiredTemperatureClass')} />
            <ErrorText message={errors.requiredTemperatureClass?.message} />
          </label>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <input
              id="location-profile-bonded-only"
              type="checkbox"
              disabled={disabled}
              {...form.register('bondedOnly')}
            />
            Chỉ áp dụng khu ngoại quan
          </label>
        </fieldset>

        <fieldset className="grid gap-2 rounded-md border p-3 md:col-span-2">
          <legend className="text-muted-foreground px-1 text-xs">Chính sách vận hành</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <input
                id="location-profile-operation-putaway-blocked"
                type="checkbox"
                disabled={disabled}
                {...form.register('operationPutawayBlocked')}
              />
              Chặn putaway (vận hành)
            </label>
            <label className="grid gap-1 text-sm">Cho phép putaway<select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                disabled={disabled}
                {...form.register('operationPutawayAllowed')}
              >
                <option value="unset">Không đặt</option>
                <option value="true">Cho phép</option>
                <option value="false">Không cho phép</option>
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <input
                id="location-profile-operation-replenishment-blocked"
                type="checkbox"
                disabled={disabled}
                {...form.register('operationReplenishmentBlocked')}
              />
              Chặn châm hàng
            </label>
            <label className="grid gap-1 text-sm">Cho phép châm hàng<select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                disabled={disabled}
                {...form.register('operationReplenishmentAllowed')}
              >
                <option value="unset">Không đặt</option>
                <option value="true">Cho phép</option>
                <option value="false">Không cho phép</option>
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <input
                id="location-profile-operation-pick-face"
                type="checkbox"
                disabled={disabled}
                {...form.register('operationPickFace')}
              />
              Là vị trí soạn hàng (pick face)
            </label>
          </div>
        </fieldset>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <ReasonCodeSelect
            id="location-profile-reason-code"
            name="reasonCode"
            label="Mã lý do"
            value={reasonCode}
            action={mode === 'create' ? 'Create' : 'Update'}
            objectType="LocationProfile"
            disabled={disabled}
            onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
          />
          <ErrorText message={errors.reasonCode?.message} />
        </div>
        <label className="grid gap-1 text-sm">Hệ thống nguồn<Input disabled={disabled} {...form.register('sourceSystem')} />
        </label>
        <label className="grid gap-1 text-sm">ID tham chiếu<Input disabled={disabled} {...form.register('referenceId')} />
        </label>
      </div>

      {inlineError && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{inlineError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled || pending}>
          {mode === 'create' ? 'Tạo hồ sơ' : 'Cập nhật hồ sơ'}
        </Button>
        {mode === 'edit' && initialValue?.status === 'Active' && onInactivate ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || pending}
            onClick={form.handleSubmit(onInactivate)}
          >
            <ArchiveX className="size-4" />Ngưng kích hoạt hồ sơ</Button>
        ) : null}
      </div>
    </form>
  );
}
