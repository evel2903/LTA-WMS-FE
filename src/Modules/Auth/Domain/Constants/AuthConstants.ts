import type { UserRole } from '@modules/Auth/Domain/Entities/User';

export const USER_ROLES: Record<UserRole, UserRole> = {
  User: 'User',
  Admin: 'Admin',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  User: 'User',
  Admin: 'Administrator',
};
