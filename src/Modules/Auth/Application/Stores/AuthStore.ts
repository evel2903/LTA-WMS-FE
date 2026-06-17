import { create } from 'zustand';

import type { User } from '@modules/Auth/Domain/Entities/User';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  status: AuthStatus;

  setUser: (user: User) => void;
  setUnauthenticated: () => void;
}

/**
 * Client state ONLY — the in-memory signed-in identity used by route guards.
 *
 * No tokens are stored anywhere (they live in HttpOnly cookies the browser
 * manages). Nothing is persisted to localStorage either: on every load the
 * source of truth is `GET /auth/me` (see `useAuthBootstrap`). This is a
 * module-local store, not a global monolith.
 *
 * `status` starts as `initializing` so guards can hold rendering until the
 * bootstrap `/auth/me` call resolves — avoiding a login-page flash for users
 * who already have valid cookies.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  status: 'initializing',

  setUser: (user) => set({ user, isAuthenticated: true, status: 'authenticated' }),

  setUnauthenticated: () =>
    set({ user: null, isAuthenticated: false, status: 'unauthenticated' }),
}));
