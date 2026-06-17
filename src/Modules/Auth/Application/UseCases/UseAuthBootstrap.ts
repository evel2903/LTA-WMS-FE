import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import { authQueryKeys } from '@modules/Auth/Application/Queries/AuthQueryKeys';
import { authRepository } from '@modules/Auth/Infrastructure/Repositories/AuthRepository';

/**
 * App-boot session resolution. Because tokens live in HttpOnly cookies, the
 * client can't read them — the only way to know if a session exists is to ask
 * the server. This hook calls `GET /auth/me` once at startup:
 *   - 200 → store the user, status `authenticated`.
 *   - 401 (after the interceptor's single-flight refresh also fails) →
 *     status `unauthenticated`.
 *
 * Mount it once, high in the tree (see `AppRouter`). Guards stay in
 * `initializing` until this resolves, preventing a login-page flash.
 */
export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  const query = useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: () => authRepository.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) setUser(query.data);
    else if (query.isError) setUnauthenticated();
  }, [query.isSuccess, query.isError, query.data, setUser, setUnauthenticated]);
}
