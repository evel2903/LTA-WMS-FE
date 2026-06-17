import type { Credentials, RegisterInput } from '@modules/Auth/Domain/Entities/AuthSession';
import type { User } from '@modules/Auth/Domain/Entities/User';

/**
 * Application port (dependency-inversion boundary). Use cases program against
 * this abstraction; Infrastructure provides the cookie-based implementation.
 * Placed in Application/Interfaces to mirror the backend's Clean Architecture
 * per module (ports live with the use cases that consume them). The server
 * sets/rotates HttpOnly cookies as a side effect — the client only ever
 * receives the resulting `User`.
 */
export interface IAuthRepository {
  /** `POST /auth/login` — sets auth cookies, returns the user. */
  login(credentials: Credentials): Promise<User>;
  /** `POST /auth/register` — creates the account, auto-logs in, returns the user. */
  register(input: RegisterInput): Promise<User>;
  /** `GET /auth/me` — the current user (401 if not authenticated). */
  getCurrentUser(): Promise<User>;
  /** `POST /auth/refresh` — rotates cookies, returns the user. */
  refresh(): Promise<User>;
  /** `POST /auth/logout` — revokes the current device's session. */
  logout(): Promise<void>;
  /** `POST /auth/logout-all` — revokes every session for the user. */
  logoutAll(): Promise<void>;
}
