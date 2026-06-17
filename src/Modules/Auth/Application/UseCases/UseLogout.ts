import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import { authRepository } from '@modules/Auth/Infrastructure/Repositories/AuthRepository';

/**
 * Signs the user out of the current device. The server revokes the refresh
 * token and clears the cookies; the access token stays valid until it expires
 * (~15 min), so we ALWAYS clear local state regardless of the call's outcome
 * (Auth-Integration-FE.md §6).
 *
 * @param all when true, calls `/auth/logout-all` to end every session.
 */
export function useLogout() {
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const queryClient = useQueryClient();

  return useMutation<void, Error, boolean>({
    mutationFn: (all: boolean) =>
      (all ? authRepository.logoutAll() : authRepository.logout()).catch(() => undefined),
    onSettled: () => {
      setUnauthenticated();
      queryClient.clear();
    },
  });
}
