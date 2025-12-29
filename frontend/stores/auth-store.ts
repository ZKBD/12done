import * as React from 'react';
import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';

// Define User type inline to avoid path resolution issues in CI
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  avatarUrl?: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'PENDING_PROFILE' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthPersist = (
  config: StateCreator<AuthState>,
  options: PersistOptions<AuthState, Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'isAuthenticated'>>
) => StateCreator<AuthState>;

export const useAuthStore = create<AuthState>()(
  (persist as AuthPersist)(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user: User, accessToken: string, refreshToken: string) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      setUser: (user: User) =>
        set({ user }),

      setTokens: (accessToken: string, refreshToken: string) =>
        set({ accessToken, refreshToken }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: AuthState) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper hook to check if store has hydrated
export const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = React.useState(false);

  React.useEffect(() => {
    // Zustand persist rehydrates synchronously on first render
    // but we need to wait for React to commit the hydrated state
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    // Check if already hydrated (in case onFinishHydration already fired)
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hasHydrated;
};
