import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BiometricService } from './biometric.service';
import { MfaService } from './mfa.service';
import { UserRole, UserStatus, VerificationStatus } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    idVerificationStatus: VerificationStatus.PENDING,
    backgroundCheckStatus: VerificationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            verifyEmail: jest.fn(),
            completeProfile: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            getMe: jest.fn(),
          },
        },
        {
          provide: BiometricService,
          useValue: {
            enrollDevice: jest.fn(),
            generateChallenge: jest.fn(),
            authenticate: jest.fn(),
            getDevices: jest.fn(),
            updateDevice: jest.fn(),
            removeDevice: jest.fn(),
            updateBiometricSettings: jest.fn(),
            isBiometricRequired: jest.fn(),
            verifyForSensitiveAction: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: {
            setupMfa: jest.fn(),
            verifySetup: jest.fn(),
            createPendingSession: jest.fn(),
            verifyLogin: jest.fn(),
            getStatus: jest.fn(),
            regenerateBackupCodes: jest.fn(),
            disable: jest.fn(),
            isMfaEnabled: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should call authService.register with dto', async () => {
      const expectedResponse = { message: 'Verification email sent' };
      authService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should return message response on success', async () => {
      authService.register.mockResolvedValue({ message: 'Registration successful' });

      const result = await controller.register(registerDto);

      expect(result.message).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.register.mockRejectedValue(new Error('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto = {
      token: 'verification-token-123',
    };

    it('should call authService.verifyEmail with dto', async () => {
      authService.verifyEmail.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto);
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should return user and tokens on success', async () => {
      authService.verifyEmail.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.verifyEmail.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow('Invalid token');
    });
  });

  describe('completeProfile', () => {
    const completeProfileDto = {
      address: '123 Main St',
      city: 'Budapest',
      postalCode: '1011',
      country: 'HU',
      phone: '+36201234567',
    };

    it('should call authService.completeProfile with userId and dto', async () => {
      authService.completeProfile.mockResolvedValue({
        user: mockUser,
        message: 'Profile completed',
      });

      const result = await controller.completeProfile('user-123', completeProfileDto);

      expect(authService.completeProfile).toHaveBeenCalledWith('user-123', completeProfileDto);
      expect(result.user).toEqual(mockUser);
      expect(result.message).toBe('Profile completed');
    });

    it('should return user and message on success', async () => {
      authService.completeProfile.mockResolvedValue({
        user: mockUser,
        message: 'Profile completed successfully',
      });

      const result = await controller.completeProfile('user-123', completeProfileDto);

      expect(result.user).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.completeProfile.mockRejectedValue(new Error('Profile already completed'));

      await expect(
        controller.completeProfile('user-123', completeProfileDto),
      ).rejects.toThrow('Profile already completed');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should call authService.login with dto', async () => {
      authService.login.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect('user' in result && result.user).toEqual(mockUser);
      expect('tokens' in result && result.tokens).toEqual(mockTokens);
    });

    it('should return user and tokens on success', async () => {
      authService.login.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.login(loginDto);

      expect('user' in result).toBe(true);
      if ('user' in result) {
        expect(result.user).toBeDefined();
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
      }
    });

    it('should propagate service errors', async () => {
      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = {
      refreshToken: 'old-refresh-token',
    };

    it('should call authService.refreshToken with dto', async () => {
      authService.refreshToken.mockResolvedValue(mockTokens);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual(mockTokens);
    });

    it('should return new tokens on success', async () => {
      authService.refreshToken.mockResolvedValue(mockTokens);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    const logoutDto = {
      refreshToken: 'token-to-revoke',
    };

    it('should call authService.logout with refresh token', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      const result = await controller.logout(logoutDto);

      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
      expect(result.message).toBe('Logged out successfully');
    });

    it('should return message on success', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out' });

      const result = await controller.logout(logoutDto);

      expect(result.message).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.logout.mockRejectedValue(new Error('Token not found'));

      await expect(controller.logout(logoutDto)).rejects.toThrow('Token not found');
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should call authService.forgotPassword with dto', async () => {
      authService.forgotPassword.mockResolvedValue({
        message: 'If account exists, reset email will be sent',
      });

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
      expect(result.message).toContain('reset email');
    });

    it('should return message on success', async () => {
      authService.forgotPassword.mockResolvedValue({ message: 'Reset email sent' });

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result.message).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.forgotPassword.mockRejectedValue(new Error('Service error'));

      await expect(controller.forgotPassword(forgotPasswordDto)).rejects.toThrow('Service error');
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'reset-token-123',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('should call authService.resetPassword with dto', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result.message).toBe('Password reset successfully');
    });

    it('should return message on success', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password updated' });

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result.message).toBeDefined();
    });

    it('should propagate service errors', async () => {
      authService.resetPassword.mockRejectedValue(new Error('Invalid or expired token'));

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  describe('getMe', () => {
    const currentUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    };

    it('should call authService.getMe with user id', async () => {
      authService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe(currentUser);

      expect(authService.getMe).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return user profile', async () => {
      authService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe(currentUser);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
    });

    it('should propagate service errors', async () => {
      authService.getMe.mockRejectedValue(new Error('User not found'));

      await expect(controller.getMe(currentUser)).rejects.toThrow('User not found');
    });
  });

  describe('controller methods return types', () => {
    it('register should return MessageResponseDto shape', async () => {
      authService.register.mockResolvedValue({ message: 'Success' });

      const result = await controller.register({
        email: 'test@example.com',
        password: 'Pass123!',
        confirmPassword: 'Pass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toHaveProperty('message');
    });

    it('verifyEmail should return user and tokens', async () => {
      authService.verifyEmail.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.verifyEmail({ token: 'token' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('login should return user and tokens', async () => {
      authService.login.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.login({ email: 'test@example.com', password: 'Pass123!' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('refreshToken should return AuthTokensDto shape', async () => {
      authService.refreshToken.mockResolvedValue(mockTokens);

      const result = await controller.refreshToken({ refreshToken: 'token' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('getMe should return UserResponseDto shape', async () => {
      authService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe({ id: 'user-123', email: 'test@example.com', role: UserRole.USER, status: UserStatus.ACTIVE });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
    });
  });
});
