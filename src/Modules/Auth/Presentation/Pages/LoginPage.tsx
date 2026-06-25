import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { LoginForm } from '@modules/Auth/Presentation/Forms/LoginForm';

export function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>Nhập thông tin tài khoản để truy cập hệ thống.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        <p className="text-muted-foreground text-center text-sm">
          Chưa có tài khoản?{' '}
          <Link to={ROUTES.REGISTER} className="text-primary underline-offset-4 hover:underline">
            Tạo tài khoản
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
