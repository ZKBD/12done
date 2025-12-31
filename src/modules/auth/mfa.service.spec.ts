import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { MfaService } from './mfa.service';
import { PrismaService } from '@/database';
import { UserRole, UserStatus } from '@prisma/client';

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
  },
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

// Mock the common utils module
jest.mock('@/common/utils', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-value'),
  generateSecureToken: jest.fn().mockReturnValue('secure-token-123'),
}));

// Get references to the mocked functions
import * as utils from '@/common/utils';
import * as crypto from 'crypto';

const mockComparePassword = utils.comparePassword as jest.Mock;

// Helper to create a properly encrypted secret for testing
function createTestEncryptedSecret(secret: string): string {
  const key = crypto.scryptSync('test-jwt-secret', 'mfa-salt', 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

describe('MfaService', () => {
  let service: MfaService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    mfaSecret: { create: jest.Mock; update: jest.Mock; delete: jest.Mock; findUnique: jest.Mock };
    mfaBackupCode: { createMany: jest.Mock; deleteMany: jest.Mock; update: jest.Mock };
    mfaPendingSession: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock };
    refreshToken: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    mfaEnabled: false,
    mfaSecret: null,
  };

  // Create a properly encrypted test secret
  const testTotpSecret = 'TESTSECRET123456';
  const testEncryptedSecret = createTestEncryptedSecret(testTotpSecret);

  const mockMfaSecret = {
    id: 'mfa-secret-123',
    userId: 'user-123',
    encryptedSecret: testEncryptedSecret,
    isVerified: true,
    enabledAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBackupCodes = [
    { id: 'backup-1', mfaSecretId: 'mfa-secret-123', codeHash: 'hash1', usedAt: null, createdAt: new Date() },
    { id: 'backup-2', mfaSecretId: 'mfa-secret-123', codeHash: 'hash2', usedAt: null, createdAt: new Date() },
  ];

  const mockPendingSession = {
    id: 'session-123',
    userId: 'user-123',
    token: 'mfa_token123',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      mfaSecret: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      mfaBackupCode: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      mfaPendingSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => {
        if (typeof fn === 'function') {
          return fn(mockPrismaService);
        }
        return Promise.all(fn);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, string | undefined> = {
                'jwt.secret': 'test-jwt-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
                'MFA_ENCRYPTION_KEY': undefined, // Force fallback to derived key
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMfa', () => {
    it('should generate secret, QR code, and backup codes for new setup', async () => {
      (authenticator.generateSecret as jest.Mock).mockReturnValue('TESTSECRET123');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://totp/...');

      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaSecret: null });
      prisma.mfaSecret.create.mockResolvedValue(mockMfaSecret);

      const result = await service.setupMfa('user-123');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.message).toContain('Scan QR code');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setupMfa('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if MFA is already enabled and verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: { ...mockMfaSecret, isVerified: true },
      });

      await expect(service.setupMfa('user-123')).rejects.toThrow(BadRequestException);
    });

    it('should allow re-setup if previous setup was not verified', async () => {
      (authenticator.generateSecret as jest.Mock).mockReturnValue('NEWSECRET');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://totp/...');

      const unverifiedSecret = { ...mockMfaSecret, isVerified: false };
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaSecret: unverifiedSecret,
      });
      prisma.mfaSecret.create.mockResolvedValue(mockMfaSecret);

      const result = await service.setupMfa('user-123');

      expect(result).toHaveProperty('secret');
      expect(result.backupCodes).toHaveLength(10);
    });
  });

  describe('verifySetup', () => {
    it('should enable MFA when valid TOTP code is provided', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const unverifiedSecret = { ...mockMfaSecret, isVerified: false };
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaSecret: unverifiedSecret,
      });
      prisma.mfaSecret.update.mockResolvedValue({ ...mockMfaSecret, isVerified: true });
      prisma.user.update.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.verifySetup('user-123', '123456');

      expect(result.message).toContain('MFA enabled');
      expect(result.enabledAt).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifySetup('nonexistent', '123456')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if MFA setup not initiated', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaSecret: null });

      await expect(service.verifySetup('user-123', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if MFA already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaSecret: { ...mockMfaSecret, isVerified: true },
      });

      await expect(service.verifySetup('user-123', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for invalid TOTP code', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const unverifiedSecret = { ...mockMfaSecret, isVerified: false };
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaSecret: unverifiedSecret,
      });

      await expect(service.verifySetup('user-123', '000000')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createPendingSession', () => {
    it('should create a pending session with token and expiry', async () => {
      prisma.mfaPendingSession.deleteMany.mockResolvedValue({ count: 0 });
      prisma.mfaPendingSession.create.mockResolvedValue(mockPendingSession);

      const result = await service.createPendingSession('user-123');

      expect(result.mfaPending).toBe(true);
      expect(result.mfaToken).toMatch(/^mfa_/);
      expect(result.expiresAt).toBeDefined();
      expect(result.message).toContain('authenticator code');
    });

    it('should clean up expired sessions for user', async () => {
      prisma.mfaPendingSession.deleteMany.mockResolvedValue({ count: 2 });
      prisma.mfaPendingSession.create.mockResolvedValue(mockPendingSession);

      await service.createPendingSession('user-123');

      expect(prisma.mfaPendingSession.deleteMany).toHaveBeenCalled();
    });
  });

  describe('verifyLogin', () => {
    it('should return tokens for valid TOTP code', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      prisma.mfaPendingSession.findUnique.mockResolvedValue(mockPendingSession);
      prisma.user.findUnique
        .mockResolvedValueOnce({
          ...mockUser,
          mfaEnabled: true,
          mfaSecret: { ...mockMfaSecret, backupCodes: mockBackupCodes },
        })
        .mockResolvedValueOnce(mockUser);
      prisma.mfaPendingSession.delete.mockResolvedValue(mockPendingSession);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyLogin('mfa_token123', '123456');

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid session token', async () => {
      prisma.mfaPendingSession.findUnique.mockResolvedValue(null);

      await expect(service.verifyLogin('invalid_token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired session', async () => {
      const expiredSession = {
        ...mockPendingSession,
        expiresAt: new Date(Date.now() - 60000),
      };
      prisma.mfaPendingSession.findUnique.mockResolvedValue(expiredSession);
      prisma.mfaPendingSession.delete.mockResolvedValue(expiredSession);

      await expect(service.verifyLogin('mfa_token123', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid TOTP code', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      prisma.mfaPendingSession.findUnique.mockResolvedValue(mockPendingSession);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: { ...mockMfaSecret, backupCodes: mockBackupCodes },
      });

      await expect(service.verifyLogin('mfa_token123', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow login with valid backup code', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);
      mockComparePassword.mockResolvedValue(true);

      prisma.mfaPendingSession.findUnique.mockResolvedValue(mockPendingSession);
      prisma.user.findUnique
        .mockResolvedValueOnce({
          ...mockUser,
          mfaEnabled: true,
          mfaSecret: { ...mockMfaSecret, backupCodes: mockBackupCodes },
        })
        .mockResolvedValueOnce(mockUser);
      prisma.mfaBackupCode.update.mockResolvedValue({ ...mockBackupCodes[0], usedAt: new Date() });
      prisma.mfaPendingSession.delete.mockResolvedValue(mockPendingSession);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyLogin('mfa_token123', 'BACKUP12');

      expect(result.tokens).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return MFA status when enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: {
          ...mockMfaSecret,
          backupCodes: mockBackupCodes.filter(c => !c.usedAt),
        },
      });

      const result = await service.getStatus('user-123');

      expect(result.enabled).toBe(true);
      expect(result.enabledAt).toBeDefined();
      expect(result.backupCodesRemaining).toBe(2);
    });

    it('should return disabled status when MFA not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: null,
      });

      const result = await service.getStatus('user-123');

      expect(result.enabled).toBe(false);
      expect(result.backupCodesRemaining).toBe(0);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes with valid password', async () => {
      mockComparePassword.mockResolvedValue(true);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: mockMfaSecret,
      });
      prisma.mfaBackupCode.deleteMany.mockResolvedValue({ count: 10 });
      prisma.mfaBackupCode.createMany.mockResolvedValue({ count: 10 });

      const result = await service.regenerateBackupCodes('user-123', 'password123');

      expect(result.codes).toHaveLength(10);
      expect(result.message).toContain('backup codes generated');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.regenerateBackupCodes('nonexistent', 'password')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(service.regenerateBackupCodes('user-123', 'password')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockComparePassword.mockResolvedValue(false);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: mockMfaSecret,
      });

      await expect(service.regenerateBackupCodes('user-123', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('disable', () => {
    it('should disable MFA with valid password and TOTP code', async () => {
      mockComparePassword.mockResolvedValue(true);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: mockMfaSecret,
      });
      prisma.mfaBackupCode.deleteMany.mockResolvedValue({ count: 10 });
      prisma.mfaSecret.delete.mockResolvedValue(mockMfaSecret);
      prisma.user.update.mockResolvedValue({ ...mockUser, mfaEnabled: false });
      prisma.mfaPendingSession.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.disable('user-123', 'password123', '123456');

      expect(result.message).toContain('MFA has been disabled');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.disable('nonexistent', 'password', '123456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(service.disable('user-123', 'password', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockComparePassword.mockResolvedValue(false);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: mockMfaSecret,
      });

      await expect(service.disable('user-123', 'wrongpassword', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid TOTP code', async () => {
      mockComparePassword.mockResolvedValue(true);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: mockMfaSecret,
      });

      await expect(service.disable('user-123', 'password', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('isMfaEnabled', () => {
    it('should return true when MFA is enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.isMfaEnabled('user-123');

      expect(result).toBe(true);
    });

    it('should return false when MFA is not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: false });

      const result = await service.isMfaEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.isMfaEnabled('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('backup code format', () => {
    it('should generate backup codes without confusing characters', async () => {
      (authenticator.generateSecret as jest.Mock).mockReturnValue('TESTSECRET');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://...');

      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaSecret: null });
      prisma.mfaSecret.create.mockResolvedValue(mockMfaSecret);

      const result = await service.setupMfa('user-123');

      // Check that codes don't contain confusing characters (0, O, 1, I)
      const confusingChars = /[0OIl1]/;
      result.backupCodes.forEach(code => {
        expect(code).not.toMatch(confusingChars);
        expect(code).toHaveLength(8);
      });
    });
  });
});
