import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
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
import { useRegister } from '@modules/Auth/Application/UseCases/UseRegister';
import {
  registerSchema,
  type RegisterFormValues,
} from '@modules/Auth/Presentation/Forms/RegisterSchema';

/** UI-only register form. Delegates to `useRegister`; auto-logs in on success. */
export function RegisterForm() {
  const navigate = useNavigate();
  const { mutate: register, isPending } = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', emailAddress: '', password: '' },
  });

  const onSubmit = (values: RegisterFormValues) => {
    register(values, {
      onSuccess: () => navigate(ROUTES.DASHBOARD, { replace: true }),
      onError: (error) => {
        const message =
          error instanceof ApiError
            ? error.code === 'CONFLICT'
              ? 'Email này đã được đăng ký.'
              : error.message
            : 'Không thể đăng ký. Vui lòng thử lại.';
        toast.error('Đăng ký thất bại', { description: message });
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Họ</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="emailAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Spinner />}
          Tạo tài khoản
        </Button>
      </form>
    </Form>
  );
}
