import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import type { User } from '@modules/Auth/Domain/Entities/User';

/**
 * Convenience selector for components that just need the signed-in user.
 * The identity is resolved once at boot by `useAuthBootstrap`; this reads it
 * from the module store without triggering a fetch.
 */
export function useCurrentUser(): User | null {
  return useAuthStore((s) => s.user);
}
