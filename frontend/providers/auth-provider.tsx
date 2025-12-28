'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useHasHydrated } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import type { User, LoginDto, RegisterDto, CompleteProfileDto } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  completeProfile: (data: CompleteProfileDto) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
];

const PROTECTED_PATHS = ['/dashboard', '/favorites', '/search-agents'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useHasHydrated();
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    setAuth,
    setUser,
    clearAuth,
    setLoading,
  } = useAuthStore();

  // Check auth status after hydration (only if we have a token but no user)
  useEffect(() => {
    if (!hasHydrated) return;

    const checkAuth = async () => {
      // Skip if we already have a user (e.g., just logged in or restored from localStorage)
      if (user) {
        setLoading(false);
        return;
      }

      if (accessToken) {
        try {
          const currentUser = await authApi.getMe();
          setUser(currentUser);
        } catch {
          clearAuth();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [hasHydrated, accessToken, user, setUser, clearAuth, setLoading]);

  // Protect routes - only after hydration and loading is complete
  useEffect(() => {
    if (!hasHydrated || isLoading) return;

    const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    const isPublicAuthPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    // Redirect to login if accessing protected route without auth
    if (isProtectedPath && !isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    // Redirect to dashboard if accessing auth routes while logged in
    // Use window.location for full page navigation to avoid RSC issues
    if (isPublicAuthPath && isAuthenticated && user?.status === 'ACTIVE') {
      window.location.href = '/dashboard';
      return;
    }

    // Redirect to complete-profile if user needs to complete profile
    if (
      isAuthenticated &&
      user?.status === 'PENDING_PROFILE' &&
      pathname !== '/complete-profile'
    ) {
      window.location.href = '/complete-profile';
    }
  }, [hasHydrated, isLoading, isAuthenticated, pathname, user]);

  const login = useCallback(
    async (data: LoginDto) => {
      const response = await authApi.login(data);
      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);

      // Use window.location for reliable navigation after login
      if (response.user.status === 'PENDING_PROFILE') {
        window.location.href = '/complete-profile';
      } else {
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirect || '/dashboard';
      }
    },
    [setAuth]
  );

  const register = useCallback(
    async (data: RegisterDto) => {
      await authApi.register(data);
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    },
    [router]
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth();
    window.location.href = '/';
  }, [refreshToken, clearAuth]);

  const completeProfile = useCallback(
    async (data: CompleteProfileDto) => {
      const response = await authApi.completeProfile(data);
      setUser(response.user);
      window.location.href = '/dashboard';
    },
    [setUser]
  );

  // Show loading spinner until hydrated
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        completeProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
