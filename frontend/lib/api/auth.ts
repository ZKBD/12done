import { apiClient } from './client';
import type {
  User,
  AuthTokens,
  LoginResponse,
  RegisterDto,
  LoginDto,
  CompleteProfileDto,
} from '@/lib/types';

export const authApi = {
  // Register a new user
  register: (data: RegisterDto): Promise<{ message: string }> =>
    apiClient.post('/auth/register', data),

  // Verify email with token
  verifyEmail: (token: string): Promise<LoginResponse> =>
    apiClient.post('/auth/verify-email', { token }),

  // Login with email/password
  login: (data: LoginDto): Promise<LoginResponse> =>
    apiClient.post('/auth/login', data),

  // Refresh access token
  refresh: (refreshToken: string): Promise<AuthTokens> =>
    apiClient.post('/auth/refresh', { refreshToken }),

  // Logout (revoke refresh token)
  logout: (refreshToken: string): Promise<{ message: string }> =>
    apiClient.post('/auth/logout', { refreshToken }),

  // Complete user profile
  completeProfile: (data: CompleteProfileDto): Promise<{ user: User; message: string }> =>
    apiClient.post('/auth/complete-profile', data),

  // Get current user
  getMe: (): Promise<User> =>
    apiClient.get('/auth/me'),

  // Request password reset
  forgotPassword: (email: string): Promise<{ message: string }> =>
    apiClient.post('/auth/forgot-password', { email }),

  // Reset password with token
  resetPassword: (data: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ message: string }> =>
    apiClient.post('/auth/reset-password', data),
};
