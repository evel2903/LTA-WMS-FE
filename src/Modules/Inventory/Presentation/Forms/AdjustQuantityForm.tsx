import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/Components/Ui/Form';
import { Input } from '@shared/Components/Ui/Input';
import { Spinner } from '@shared/Components/Feedback/Spinner';
import { toast } from '@shared/Components/Ui/Toast';
import { useAdjustQuantity } from '@modules/Inventory/Application/Commands/UseAdjustQuantity';
import {
  adjustQuantitySchema,
  type AdjustQuantityFormValues,
} from '@modules/Inventory/Presentation/Forms/AdjustQuantitySchema';

interface AdjustQuantityFormProps {
  itemId: string;
  onAdjusted?: () => void;
}

/**
 * React Hook Form + Zod form. UI-only: validate, hand off to the command hook,
 * surface success/error. Business invariants live in the use case, not here.
 */
export function AdjustQuantityForm({ itemId, onAdjusted }: AdjustQuantityFormProps) {
  const { mutate: adjust, isPending } = useAdjustQuantity();

  const form = useForm<AdjustQuantityFormValues>({
    resolver: zodResolver(adjustQuantitySchema),
    defaultValues: { delta: 0, reason: '' },
  });

  const onSubmit = (values: AdjustQuantityFormValues) => {
    adjust(
      { itemId, delta: values.delta, reason: values.reason },
      {
        onSuccess: () => {
          toast.success('Đã điều chỉnh tồn kho');
          form.reset();
          onAdjusted?.();
        },
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : 'Điều chỉnh tồn kho thất bại.';
          toast.error('Không thể điều chỉnh tồn kho', { description: message });
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="delta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lượng điều chỉnh (+/-)</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lý do</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: điều chỉnh sau kiểm kê" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          Áp dụng điều chỉnh
        </Button>
      </form>
    </Form>
  );
}
