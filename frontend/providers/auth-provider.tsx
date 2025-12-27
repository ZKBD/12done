'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
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

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
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
  }, [accessToken, setUser, clearAuth, setLoading]);

  // Protect routes
  useEffect(() => {
    if (isLoading) return;

    const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    const isPublicAuthPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    // Redirect to login if accessing protected route without auth
    if (isProtectedPath && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Redirect to dashboard if accessing auth routes while logged in
    if (isPublicAuthPath && isAuthenticated && user?.status === 'ACTIVE') {
      router.push('/dashboard');
      return;
    }

    // Redirect to complete-profile if user needs to complete profile
    if (
      isAuthenticated &&
      user?.status === 'PENDING_PROFILE' &&
      pathname !== '/complete-profile'
    ) {
      router.push('/complete-profile');
    }
  }, [isLoading, isAuthenticated, pathname, user, router]);

  const login = useCallback(
    async (data: LoginDto) => {
      const response = await authApi.login(data);
      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);

      if (response.user.status === 'PENDING_PROFILE') {
        router.push('/complete-profile');
      } else {
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        router.push(redirect || '/dashboard');
      }
    },
    [setAuth, router]
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
    router.push('/');
  }, [refreshToken, clearAuth, router]);

  const completeProfile = useCallback(
    async (data: CompleteProfileDto) => {
      const response = await authApi.completeProfile(data);
      setUser(response.user);
      router.push('/dashboard');
    },
    [setUser, router]
  );

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
