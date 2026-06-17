/**
 * Inputs to the authentication use cases.
 *
 * Note: there is no token-bearing "session" object on the client — JWTs live in
 * HttpOnly cookies the browser manages. The signed-in identity is just the
 * `User` returned by login/register/refresh and confirmed by `GET /auth/me`.
 */

/** Credentials accepted by the login use case. */
export interface Credentials {
  emailAddress: string;
  password: string;
}

/** Payload accepted by the register use case. */
export interface RegisterInput {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
}
