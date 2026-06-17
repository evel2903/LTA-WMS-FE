import { AppProviders } from '@app/Providers/AppProviders';
import { AppRouter } from '@app/Router/AppRouter';

/**
 * Application root. Composes the global provider stack around the router.
 * Keep this component thin — orchestration only, no business logic.
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
