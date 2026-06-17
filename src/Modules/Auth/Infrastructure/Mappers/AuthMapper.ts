import type { Credentials, RegisterInput } from '@modules/Auth/Domain/Entities/AuthSession';
import type { User, UserId, UserRole } from '@modules/Auth/Domain/Entities/User';
import type {
  LoginRequestDto,
  MeDto,
  RegisterRequestDto,
  UserDto,
} from '@modules/Auth/Infrastructure/Dtos/AuthDtos';

function toRole(raw: string): UserRole {
  return raw === 'Admin' ? 'Admin' : 'User';
}

/**
 * Translates between wire DTOs and Domain entities. The ONLY place that knows
 * the backend's PascalCase shapes and the `/auth/me` `UserId` quirk.
 */
export const AuthMapper = {
  /** From login/register/refresh `Data.User`. */
  toUser(dto: UserDto): User {
    return {
      id: dto.Id as UserId,
      emailAddress: dto.EmailAddress,
      role: toRole(dto.Role),
    };
  },

  /** From `GET /auth/me` `Data` (flattened, `UserId`). */
  fromMe(dto: MeDto): User {
    return {
      id: dto.UserId as UserId,
      emailAddress: dto.EmailAddress,
      role: toRole(dto.Role),
    };
  },

  toLoginRequest(credentials: Credentials): LoginRequestDto {
    return {
      EmailAddress: credentials.emailAddress,
      Password: credentials.password,
    };
  },

  toRegisterRequest(input: RegisterInput): RegisterRequestDto {
    return {
      FirstName: input.firstName,
      LastName: input.lastName,
      EmailAddress: input.emailAddress,
      Password: input.password,
    };
  },
};
