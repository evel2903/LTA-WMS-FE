import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';

/**
 * Bridges the transport layer to app state: when the Axios interceptor fails to
 * refresh the cookie session it dispatches `auth:session-expired`. This hook
 * listens once (mounted high in the tree) and marks the session unauthenticated,
 * which lets the route guards redirect to /login.
 */
export function useSessionExpiry() {
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      setUnauthenticated();
      queryClient.clear();
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [setUnauthenticated, queryClient]);
}
