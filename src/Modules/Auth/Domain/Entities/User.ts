import type { Id } from '@shared/Types/Common';

export type UserId = Id<'User'>;

/** Roles recognised by the backend authorization model. */
export type UserRole = 'User' | 'Admin';

/**
 * Domain entity — the in-app representation of an authenticated user, exactly
 * as the backend models it (`{ Id, EmailAddress, Role }`). Pure data +
 * behaviour. No React, Axios, Zustand, or DTO shapes here.
 */
export interface User {
  id: UserId;
  emailAddress: string;
  role: UserRole;
}

/** Domain rule: elevated privileges. */
export function isAdmin(user: User): boolean {
  return user.role === 'Admin';
}

/** Display helper used by the UI when no real name is available. */
export function displayName(user: User): string {
  return user.emailAddress;
}
