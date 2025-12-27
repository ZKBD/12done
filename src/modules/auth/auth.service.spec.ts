import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import * as hashUtil from '@/common/utils/hash.util';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    address: null,
    postalCode: null,
    city: null,
    country: null,
    role: 'USER',
    status: UserStatus.ACTIVE,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    idVerificationStatus: 'NOT_STARTED',
    idVerifiedAt: null,
    backgroundCheckStatus: 'NOT_STARTED',
    backgroundCheckAt: null,
    invitedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVerificationToken = {
    id: 'token-123',
    userId: 'user-123',
    token: 'verification-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: null,
    user: { ...mockUser, status: UserStatus.PENDING_VERIFICATION },
  };

  const mockRefreshToken = {
    id: 'refresh-123',
    userId: 'user-123',
    token: 'refresh-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    user: mockUser,
  };

  const mockPasswordResetToken = {
    id: 'reset-123',
    userId: 'user-123',
    token: 'reset-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    user: mockUser,
  };

  const mockInvitation = {
    id: 'invitation-123',
    inviterId: 'inviter-123',
    email: 'new@example.com',
    token: 'invitation-token',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            emailVerificationToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            passwordResetToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            invitation: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendWelcomeEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'SecureP@ss123',
      confirmPassword: 'SecureP@ss123',
    };

    it('should throw BadRequestException if passwords do not match', async () => {
      await expect(
        service.register({ ...registerDto, confirmPassword: 'different' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should register a new user successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: registerDto.email,
        status: UserStatus.PENDING_VERIFICATION,
      });
      (prismaService.emailVerificationToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'verification-token',
      });

      const result = await service.register(registerDto);

      expect(result.message).toContain('Registration successful');
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(prismaService.emailVerificationToken.create).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
        status: UserStatus.PENDING_VERIFICATION,
      });
      (prismaService.emailVerificationToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'verification-token',
      });

      await service.register({ ...registerDto, email: 'NEW@EXAMPLE.COM' });

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
          }),
        }),
      );
    });

    it('should throw BadRequestException for invalid invitation token', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.register({ ...registerDto, invitationToken: 'invalid-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for used invitation', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: 'ACCEPTED',
      });

      await expect(
        service.register({ ...registerDto, invitationToken: 'used-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired invitation', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000),
      });
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.register({ ...registerDto, invitationToken: 'expired-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register with valid invitation and update invitation status', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        invitedById: mockInvitation.inviterId,
      });
      (prismaService.emailVerificationToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'verification-token',
      });
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({});

      await service.register({ ...registerDto, invitationToken: mockInvitation.token });

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invitedById: mockInvitation.inviterId,
          }),
        }),
      );
      expect(prismaService.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACCEPTED',
          }),
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException for invalid token', async () => {
      (prismaService.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'invalid' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already used token', async () => {
      (prismaService.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockVerificationToken,
        usedAt: new Date(),
      });

      await expect(service.verifyEmail({ token: 'used-token' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      (prismaService.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockVerificationToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail({ token: 'expired' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should verify email successfully', async () => {
      (prismaService.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(
        mockVerificationToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        status: UserStatus.PENDING_PROFILE,
      });
      (prismaService.emailVerificationToken.update as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        token: 'new-refresh-token',
      });

      const result = await service.verifyEmail({ token: mockVerificationToken.token });

      expect(result.user.emailVerified).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: true,
            status: UserStatus.PENDING_PROFILE,
          }),
        }),
      );
    });
  });

  describe('completeProfile', () => {
    const completeProfileDto = {
      address: '123 Test Street',
      postalCode: '1051',
      city: 'Budapest',
      country: 'hu',
      phone: '+36201234567',
    };

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.completeProfile('user-123', completeProfileDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if profile already completed', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      await expect(
        service.completeProfile('user-123', completeProfileDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email not verified', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_VERIFICATION,
      });

      await expect(
        service.completeProfile('user-123', completeProfileDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete profile successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_PROFILE,
      });
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...completeProfileDto,
        country: 'HU',
        status: UserStatus.ACTIVE,
      });

      const result = await service.completeProfile('user-123', completeProfileDto);

      expect(result.user.status).toBe(UserStatus.ACTIVE);
      expect(result.message).toContain('Profile completed');
      expect(mailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should normalize country to uppercase', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_PROFILE,
      });
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        country: 'HU',
        status: UserStatus.ACTIVE,
      });

      await service.completeProfile('user-123', completeProfileDto);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'HU',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecureP@ss123',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_VERIFICATION,
      });
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully with valid credentials', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'refresh-token-id',
        token: 'mock-refresh-token',
      });

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should normalize email to lowercase for login', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        token: 'mock-refresh-token',
      });

      await service.login({ ...loginDto, email: 'TEST@EXAMPLE.COM' });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'invalid' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked refresh token', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
      });

      await expect(
        service.refreshToken({ refreshToken: 'revoked' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.refreshToken({ refreshToken: 'expired' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        user: { ...mockUser, status: UserStatus.SUSPENDED },
      });

      await expect(
        service.refreshToken({ refreshToken: 'valid' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        user: { ...mockUser, status: UserStatus.DELETED },
      });

      await expect(
        service.refreshToken({ refreshToken: 'valid' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh tokens successfully', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        token: 'new-refresh-token',
      });

      const result = await service.refreshToken({ refreshToken: mockRefreshToken.token });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully even with invalid token', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.logout('invalid-token');

      expect(result.message).toContain('Logged out');
    });

    it('should revoke refresh token on logout', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.logout(mockRefreshToken.token);

      expect(result.message).toContain('Logged out');
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('should not revoke already revoked token', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
      });

      const result = await service.logout(mockRefreshToken.token);

      expect(result.message).toContain('Logged out');
      expect(prismaService.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should return success message even if user not found (prevent enumeration)', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@example.com' });

      expect(result.message).toContain('If an account exists');
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return success message for deleted user (prevent enumeration)', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('If an account exists');
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send reset email for existing user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.passwordResetToken.create as jest.Mock).mockResolvedValue({
        id: 'reset-token-id',
        token: 'reset-token',
      });

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('If an account exists');
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should invalidate existing reset tokens', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.passwordResetToken.create as jest.Mock).mockResolvedValue({
        token: 'new-reset-token',
      });

      await service.forgotPassword({ email: mockUser.email });

      expect(prismaService.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          usedAt: null,
        },
        data: { usedAt: expect.any(Date) },
      });
    });
  });

  describe('resetPassword', () => {
    const resetDto = {
      token: 'reset-token',
      password: 'NewSecureP@ss123',
      confirmPassword: 'NewSecureP@ss123',
    };

    it('should throw BadRequestException if passwords do not match', async () => {
      await expect(
        service.resetPassword({ ...resetDto, confirmPassword: 'different' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid token', async () => {
      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for used token', async () => {
      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockPasswordResetToken,
        usedAt: new Date(),
      });

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockPasswordResetToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should reset password successfully', async () => {
      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
        mockPasswordResetToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.passwordResetToken.update as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.resetPassword(resetDto);

      expect(result.message).toContain('Password reset successfully');
      expect(prismaService.user.update).toHaveBeenCalled();
      expect(prismaService.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { usedAt: expect.any(Date) },
        }),
      );
    });

    it('should revoke all refresh tokens after password reset', async () => {
      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
        mockPasswordResetToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.passwordResetToken.update as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.resetPassword(resetDto);

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockPasswordResetToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getMe', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe('user-123')).rejects.toThrow(NotFoundException);
    });

    it('should return user profile', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMe('user-123');

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.firstName).toBe(mockUser.firstName);
    });

    it('should map null values to undefined', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMe('user-123');

      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.city).toBeUndefined();
    });
  });

  describe('token generation', () => {
    it('should generate access token with correct payload', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        token: 'mock-refresh-token',
      });

      await service.login({ email: mockUser.email, password: 'password' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          status: mockUser.status,
        }),
        expect.any(Object),
      );
    });

    it('should store refresh token in database', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        token: 'mock-refresh-token',
      });

      await service.login({ email: mockUser.email, password: 'password' });

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });
  });
});
