import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
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
    status: 'ACTIVE',
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
        status: 'PENDING_VERIFICATION',
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
        status: 'PENDING_VERIFICATION',
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
  });

  describe('forgotPassword', () => {
    it('should return success message even if user not found (prevent enumeration)', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@example.com' });

      expect(result.message).toContain('If an account exists');
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
  });
});
