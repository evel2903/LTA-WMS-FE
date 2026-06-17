import type { RegisterInput } from '@modules/Auth/Domain/Entities/AuthSession';
import type { User } from '@modules/Auth/Domain/Entities/User';
import type { IAuthRepository } from '@modules/Auth/Domain/Interfaces/IAuthRepository';

/** Business operation "register + auto-login". Server sets cookies on success. */
export class RegisterUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  execute(input: RegisterInput): Promise<User> {
    return this.authRepository.register(input);
  }
}
