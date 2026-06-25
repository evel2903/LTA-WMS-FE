import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { RegisterForm } from '@modules/Auth/Presentation/Forms/RegisterForm';

export function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>Đăng ký để truy cập hệ thống LTA-WMS.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        <p className="text-muted-foreground text-center text-sm">
          Đã có tài khoản?{' '}
          <Link to={ROUTES.LOGIN} className="text-primary underline-offset-4 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
