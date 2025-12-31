import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { BiometricDeviceType } from '@prisma/client';
import { BiometricService } from './biometric.service';
import { PrismaService } from '@/database';

describe('BiometricService', () => {
  let service: BiometricService;
  let prismaService: jest.Mocked<PrismaService>;
  let _jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    biometricEnabled: false,
    biometricCredentials: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCredential = {
    id: 'cred-123',
    userId: 'user-123',
    deviceId: 'device-123',
    deviceName: 'iPhone 14 Pro',
    deviceType: BiometricDeviceType.IOS,
    publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
    credentialId: 'cred-id-123',
    isActive: true,
    enrolledAt: new Date(),
    lastUsedAt: null,
    user: { ...mockUser, biometricEnabled: true },
  };

  const mockChallenge = {
    id: 'challenge-123',
    challenge: 'dGVzdC1jaGFsbGVuZ2U=',
    deviceId: 'device-123',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    usedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            biometricCredential: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            biometricChallenge: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'jwt.secret':
                  return 'test-secret';
                case 'jwt.expiresIn':
                  return '15m';
                case 'jwt.refreshExpiresIn':
                  return '7d';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BiometricService>(BiometricService);
    prismaService = module.get(PrismaService);
    _jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrollDevice', () => {
    const enrollDto = {
      deviceId: 'device-123',
      deviceName: 'iPhone 14 Pro',
      deviceType: BiometricDeviceType.IOS,
      publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA',
    };

    it('should enroll a new device successfully (PROD-011.1)', async () => {
      prismaService.biometricCredential.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.biometricCredential.create = jest.fn().mockResolvedValue({
        ...mockCredential,
        publicKey: enrollDto.publicKey,
      });
      prismaService.user.update = jest.fn().mockResolvedValue({ ...mockUser, biometricEnabled: true });

      const result = await service.enrollDevice('user-123', enrollDto);

      expect(result.deviceId).toBe(enrollDto.deviceId);
      expect(result.deviceName).toBe(enrollDto.deviceName);
      expect(result.deviceType).toBe(enrollDto.deviceType);
      expect(prismaService.biometricCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            deviceId: enrollDto.deviceId,
            publicKey: enrollDto.publicKey,
          }),
        }),
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { biometricEnabled: true },
      });
    });

    it('should throw ConflictException if device already enrolled (PROD-011.2)', async () => {
      prismaService.biometricCredential.findUnique = jest.fn().mockResolvedValue(mockCredential);

      await expect(service.enrollDevice('user-123', enrollDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid public key format', async () => {
      prismaService.biometricCredential.findUnique = jest.fn().mockResolvedValue(null);

      const invalidDto = { ...enrollDto, publicKey: 'not-valid-base64!@#$' };

      await expect(service.enrollDevice('user-123', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateChallenge', () => {
    it('should generate a challenge for enrolled device (PROD-011.1)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricChallenge.create = jest.fn().mockResolvedValue(mockChallenge);
      prismaService.biometricChallenge.deleteMany = jest.fn().mockResolvedValue({ count: 0 });

      const result = await service.generateChallenge({ deviceId: 'device-123' });

      expect(result.challenge).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(prismaService.biometricChallenge.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if device not enrolled (PROD-011.1)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.generateChallenge({ deviceId: 'unknown-device' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if device is inactive', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.generateChallenge({ deviceId: 'device-123' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('authenticate', () => {
    const authDto = {
      deviceId: 'device-123',
      credentialId: 'cred-id-123',
      signature: 'dGVzdC1zaWduYXR1cmU=',
      challenge: 'dGVzdC1jaGFsbGVuZ2U=',
    };

    it('should throw UnauthorizedException for invalid credential (PROD-011.1)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.authenticate(authDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if biometric is disabled (PROD-011.3)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue({
        ...mockCredential,
        user: { ...mockUser, biometricEnabled: false },
      });

      await expect(service.authenticate(authDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired challenge (PROD-011.1)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricChallenge.findUnique = jest.fn().mockResolvedValue({
        ...mockChallenge,
        expiresAt: new Date(Date.now() - 60000), // Expired
      });

      await expect(service.authenticate(authDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for already used challenge', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricChallenge.findUnique = jest.fn().mockResolvedValue({
        ...mockChallenge,
        usedAt: new Date(), // Already used
      });

      await expect(service.authenticate(authDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if challenge not found', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricChallenge.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.authenticate(authDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong device challenge', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricChallenge.findUnique = jest.fn().mockResolvedValue({
        ...mockChallenge,
        deviceId: 'other-device',
      });

      await expect(service.authenticate(authDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getDevices', () => {
    it('should return list of enrolled devices (PROD-011.2)', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        biometricEnabled: true,
        biometricCredentials: [mockCredential],
      });

      const result = await service.getDevices('user-123');

      expect(result.biometricEnabled).toBe(true);
      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].deviceId).toBe('device-123');
    });

    it('should return empty list if no devices enrolled', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        biometricCredentials: [],
      });

      const result = await service.getDevices('user-123');

      expect(result.devices).toHaveLength(0);
      expect(result.biometricEnabled).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getDevices('unknown-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDevice', () => {
    it('should update device name (PROD-011.2)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricCredential.update = jest.fn().mockResolvedValue({
        ...mockCredential,
        deviceName: 'My Work Phone',
      });

      const result = await service.updateDevice('user-123', 'cred-id-123', {
        deviceName: 'My Work Phone',
      });

      expect(result.deviceName).toBe('My Work Phone');
    });

    it('should update device active status (PROD-011.2)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricCredential.update = jest.fn().mockResolvedValue({
        ...mockCredential,
        isActive: false,
      });

      const result = await service.updateDevice('user-123', 'cred-id-123', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if device not found', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateDevice('user-123', 'unknown-cred', { deviceName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDevice', () => {
    it('should remove device and disable biometric if last device (PROD-011.2)', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricCredential.delete = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricCredential.count = jest.fn().mockResolvedValue(0);
      prismaService.user.update = jest.fn().mockResolvedValue({ ...mockUser, biometricEnabled: false });

      await service.removeDevice('user-123', 'cred-id-123');

      expect(prismaService.biometricCredential.delete).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { biometricEnabled: false },
      });
    });

    it('should keep biometric enabled if other devices remain', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricCredential.delete = jest.fn().mockResolvedValue(mockCredential);
      prismaService.biometricCredential.count = jest.fn().mockResolvedValue(1);

      await service.removeDevice('user-123', 'cred-id-123');

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if device not found', async () => {
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.removeDevice('user-123', 'unknown-cred'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBiometricSettings', () => {
    it('should enable biometric if devices exist (PROD-011.3)', async () => {
      prismaService.biometricCredential.count = jest.fn()
        .mockResolvedValueOnce(1) // Active devices check
        .mockResolvedValueOnce(1); // Total devices count
      prismaService.user.update = jest.fn().mockResolvedValue({ ...mockUser, biometricEnabled: true });

      const result = await service.updateBiometricSettings('user-123', true);

      expect(result.biometricEnabled).toBe(true);
    });

    it('should throw BadRequestException if no devices when enabling (PROD-011.3)', async () => {
      prismaService.biometricCredential.count = jest.fn().mockResolvedValue(0);

      await expect(
        service.updateBiometricSettings('user-123', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should disable biometric without device check (PROD-011.3)', async () => {
      prismaService.biometricCredential.count = jest.fn().mockResolvedValue(1);
      prismaService.user.update = jest.fn().mockResolvedValue({ ...mockUser, biometricEnabled: false });

      const result = await service.updateBiometricSettings('user-123', false);

      expect(result.biometricEnabled).toBe(false);
    });
  });

  describe('isBiometricRequired', () => {
    it('should return true for payment action (PROD-011.5)', () => {
      expect(service.isBiometricRequired('payment')).toBe(true);
    });

    it('should return true for profile_update action (PROD-011.5)', () => {
      expect(service.isBiometricRequired('profile_update')).toBe(true);
    });

    it('should return true for password_change action (PROD-011.5)', () => {
      expect(service.isBiometricRequired('password_change')).toBe(true);
    });

    it('should return false for non-sensitive actions (PROD-011.5)', () => {
      expect(service.isBiometricRequired('view_profile')).toBe(false);
      expect(service.isBiometricRequired('list_properties')).toBe(false);
    });
  });

  describe('verifyForSensitiveAction', () => {
    const verifyDto = {
      deviceId: 'device-123',
      credentialId: 'cred-id-123',
      signature: 'dGVzdC1zaWduYXR1cmU=',
      challenge: 'dGVzdC1jaGFsbGVuZ2U=',
      action: 'payment',
    };

    it('should return verified if biometric disabled (PROD-011.4 fallback)', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        biometricEnabled: false,
      });

      const result = await service.verifyForSensitiveAction('user-123', verifyDto);

      expect(result.verified).toBe(true);
      expect(result.action).toBe('payment');
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.verifyForSensitiveAction('unknown-user', verifyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for invalid credential when biometric enabled', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        biometricEnabled: true,
      });
      prismaService.biometricCredential.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.verifyForSensitiveAction('user-123', verifyDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('isUserBiometricEnabled', () => {
    it('should return true if biometric enabled', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        biometricEnabled: true,
      });

      const result = await service.isUserBiometricEnabled('user-123');

      expect(result).toBe(true);
    });

    it('should return false if biometric disabled', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        biometricEnabled: false,
      });

      const result = await service.isUserBiometricEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.isUserBiometricEnabled('unknown-user');

      expect(result).toBe(false);
    });
  });
});
