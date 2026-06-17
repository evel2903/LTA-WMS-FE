import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { RegisterForm } from '@modules/Auth/Presentation/Forms/RegisterForm';

export function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Register to access the LTA-WMS workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
