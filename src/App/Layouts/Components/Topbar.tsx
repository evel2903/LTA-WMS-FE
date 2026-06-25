import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { useTheme } from '@app/Providers/UseTheme';
import { useLogout } from '@modules/Auth/Application/UseCases/UseLogout';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import { Button } from '@shared/Components/Ui/Button';

export function Topbar() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();

  const handleSignOut = () =>
    logout(false, { onSuccess: () => navigate(ROUTES.LOGIN) });

  return (
    <header className="bg-background flex h-14 shrink-0 items-center justify-between border-b px-6">
      <div className="text-sm font-medium">
        {user ? `Xin chào, ${user.emailAddress}` : ''}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Chuyển giao diện sáng/tối"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Đăng xuất
        </Button>
      </div>
    </header>
  );
}
