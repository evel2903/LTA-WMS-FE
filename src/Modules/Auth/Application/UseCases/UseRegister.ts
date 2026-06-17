import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { RegisterInput } from '@modules/Auth/Domain/Entities/AuthSession';
import { RegisterUseCase } from '@modules/Auth/Application/UseCases/RegisterUseCase';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import { authRepository } from '@modules/Auth/Infrastructure/Repositories/AuthRepository';

const registerUseCase = new RegisterUseCase(authRepository);

/** React adapter around `RegisterUseCase` — registers and signs the user in. */
export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => registerUseCase.execute(input),
    onSuccess: (user) => {
      setUser(user);
      void queryClient.invalidateQueries();
    },
  });
}
