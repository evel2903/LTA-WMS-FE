import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { LoginForm } from '@modules/Auth/Presentation/Forms/LoginForm';

export function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your credentials to access the workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        <p className="text-muted-foreground text-center text-sm">
          No account?{' '}
          <Link to={ROUTES.REGISTER} className="text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
