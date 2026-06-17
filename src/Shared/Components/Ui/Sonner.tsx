import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { useTheme } from '@app/Providers/ThemeProvider';

/** Themed toast portal. `toast(...)` from `sonner` is used to fire toasts. */
function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return <Sonner theme={theme as ToasterProps['theme']} className="toaster group" {...props} />;
}

export { Toaster };
export { toast } from 'sonner';
