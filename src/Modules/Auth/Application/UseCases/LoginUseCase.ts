import type { Credentials } from '@modules/Auth/Domain/Entities/AuthSession';
import type { User } from '@modules/Auth/Domain/Entities/User';
import type { IAuthRepository } from '@modules/Auth/Application/Interfaces/IAuthRepository';

/**
 * Encapsulates the business operation "sign a user in". Framework-free and
 * transport-free — it depends only on the Domain port. Login policy belongs
 * here, not in the component. The server sets the auth cookies as a side
 * effect; this returns the authenticated `User`.
 */
export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  execute(credentials: Credentials): Promise<User> {
    return this.authRepository.login(credentials);
  }
}
