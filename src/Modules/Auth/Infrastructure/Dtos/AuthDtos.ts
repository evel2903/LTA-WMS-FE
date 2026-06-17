/**
 * Wire-format shapes exactly as the backend sends/receives them (PascalCase).
 * DTOs are an Infrastructure concern and must NEVER leak into Domain or
 * Presentation — the Mapper converts them to Domain entities at the boundary.
 *
 * All response DTOs below are the `Data` payload (already unwrapped from the
 * `{ Success, Data }` envelope by the HTTP client).
 */

/** User object embedded in login/register/refresh responses. */
export interface UserDto {
  Id: string;
  EmailAddress: string;
  Role: string;
}

/** `Data` of `POST /auth/login`, `/auth/register`, `/auth/refresh`. */
export interface AuthUserDataDto {
  User: UserDto;
}

/** `Data` of `GET /auth/me` (note: flattened, uses `UserId`). */
export interface MeDto {
  UserId: string;
  EmailAddress: string;
  Role: string;
}

/** `Data` of logout / logout-all. */
export interface OkDto {
  Ok: boolean;
}

// ── Requests ────────────────────────────────────────────────────────────────

export interface LoginRequestDto {
  EmailAddress: string;
  Password: string;
}

export interface RegisterRequestDto {
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  Password: string;
}
