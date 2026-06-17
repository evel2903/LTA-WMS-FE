import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Credentials } from '@modules/Auth/Domain/Entities/AuthSession';
import { LoginUseCase } from '@modules/Auth/Application/UseCases/LoginUseCase';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import { authRepository } from '@modules/Auth/Infrastructure/Repositories/AuthRepository';

const loginUseCase = new LoginUseCase(authRepository);

/**
 * React adapter around `LoginUseCase`. The only place the use case meets
 * server-state (TanStack Query) and client-state (Zustand). Components call
 * this — never the repository or use case directly.
 */
export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: Credentials) => loginUseCase.execute(credentials),
    onSuccess: (user) => {
      setUser(user);
      void queryClient.invalidateQueries();
    },
  });
}
