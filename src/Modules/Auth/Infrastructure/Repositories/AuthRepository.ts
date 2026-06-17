import { AUTH_REQUEST_CONFIG, httpClient, type HttpClient } from '@shared/Services/Http/ApiClient';
import type { Credentials, RegisterInput } from '@modules/Auth/Domain/Entities/AuthSession';
import type { User } from '@modules/Auth/Domain/Entities/User';
import type { IAuthRepository } from '@modules/Auth/Domain/Interfaces/IAuthRepository';
import { AUTH_ENDPOINTS } from '@modules/Auth/Infrastructure/Api/AuthEndpoints';
import { AuthMapper } from '@modules/Auth/Infrastructure/Mappers/AuthMapper';
import type { AuthUserDataDto, MeDto } from '@modules/Auth/Infrastructure/Dtos/AuthDtos';

/**
 * Concrete adapter implementing the Domain port `IAuthRepository`.
 *
 * Cookie-based: it sends no tokens and reads none — the browser carries the
 * HttpOnly cookies (the shared client sets `withCredentials`) and the server
 * sets/rotates them. Every call targets the host root via AUTH_REQUEST_CONFIG.
 * Constructor-injected `HttpClient` keeps it unit-testable with a mock transport.
 */
export class AuthRepository implements IAuthRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async login(credentials: Credentials): Promise<User> {
    const data = await this.http.post<AuthUserDataDto>(
      AUTH_ENDPOINTS.LOGIN,
      AuthMapper.toLoginRequest(credentials),
      AUTH_REQUEST_CONFIG,
    );
    return AuthMapper.toUser(data.User);
  }

  async register(input: RegisterInput): Promise<User> {
    const data = await this.http.post<AuthUserDataDto>(
      AUTH_ENDPOINTS.REGISTER,
      AuthMapper.toRegisterRequest(input),
      AUTH_REQUEST_CONFIG,
    );
    return AuthMapper.toUser(data.User);
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.http.get<MeDto>(AUTH_ENDPOINTS.ME, AUTH_REQUEST_CONFIG);
    return AuthMapper.fromMe(data);
  }

  async refresh(): Promise<User> {
    const data = await this.http.post<AuthUserDataDto>(
      AUTH_ENDPOINTS.REFRESH,
      null,
      AUTH_REQUEST_CONFIG,
    );
    return AuthMapper.toUser(data.User);
  }

  async logout(): Promise<void> {
    await this.http.post<unknown>(AUTH_ENDPOINTS.LOGOUT, null, AUTH_REQUEST_CONFIG);
  }

  async logoutAll(): Promise<void> {
    await this.http.post<unknown>(AUTH_ENDPOINTS.LOGOUT_ALL, null, AUTH_REQUEST_CONFIG);
  }
}

/** Default singleton used by use cases. Swap in tests via the constructor. */
export const authRepository: IAuthRepository = new AuthRepository();
