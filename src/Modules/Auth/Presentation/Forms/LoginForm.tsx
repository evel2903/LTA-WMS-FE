import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

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
import { useLogin } from '@modules/Auth/Application/UseCases/UseLogin';
import { loginSchema, type LoginFormValues } from '@modules/Auth/Presentation/Forms/LoginSchema';

/**
 * UI-only component. Collects + validates input (RHF + Zod), delegates to the
 * `useLogin` use-case hook, and renders the result. No HTTP, no business rules.
 */
export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailAddress: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    login(values, {
      onSuccess: () => {
        const from = (location.state as { from?: Location } | null)?.from?.pathname;
        void navigate(from ?? ROUTES.DASHBOARD, { replace: true });
      },
      onError: (error) => {
        const message =
          error instanceof ApiError ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.';
        toast.error('Đăng nhập thất bại', { description: message });
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="emailAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="username" placeholder="you@example.com" {...field} />
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
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Spinner />}
          Đăng nhập
        </Button>
      </form>
    </Form>
  );
}
