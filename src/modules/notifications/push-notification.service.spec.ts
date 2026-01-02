import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushPlatform } from '@prisma/client';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from '@/database';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPushToken = {
    id: 'token-123',
    userId: 'user-123',
    token: 'fcm-device-token-abc123',
    platform: PushPlatform.IOS,
    deviceId: 'device-uuid-456',
    deviceName: 'iPhone 15 Pro',
    isActive: true,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockRegisterDto = {
    token: 'fcm-device-token-abc123',
    platform: PushPlatform.IOS,
    deviceId: 'device-uuid-456',
    deviceName: 'iPhone 15 Pro',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: PrismaService,
          useValue: {
            pushToken: {
              upsert: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // No FCM key by default (mock mode)
          },
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerToken', () => {
    it('should register a new push token (PROD-041.4.1)', async () => {
      (prismaService.pushToken.upsert as jest.Mock).mockResolvedValue(mockPushToken);

      const result = await service.registerToken('user-123', mockRegisterDto);

      expect(prismaService.pushToken.upsert).toHaveBeenCalledWith({
        where: {
          userId_token: { userId: 'user-123', token: mockRegisterDto.token },
        },
        create: expect.objectContaining({
          userId: 'user-123',
          token: mockRegisterDto.token,
          platform: PushPlatform.IOS,
          isActive: true,
        }),
        update: expect.objectContaining({
          platform: PushPlatform.IOS,
          isActive: true,
        }),
      });

      expect(result).toEqual({
        id: mockPushToken.id,
        platform: PushPlatform.IOS,
        deviceId: mockPushToken.deviceId,
        deviceName: mockPushToken.deviceName,
        isActive: true,
        lastUsedAt: undefined,
        createdAt: mockPushToken.createdAt,
      });
    });

    it('should update existing token if already registered (PROD-041.4.2)', async () => {
      (prismaService.pushToken.upsert as jest.Mock).mockResolvedValue({
        ...mockPushToken,
        updatedAt: new Date('2026-01-02'),
      });

      await service.registerToken('user-123', mockRegisterDto);

      expect(prismaService.pushToken.upsert).toHaveBeenCalled();
    });

    it('should handle Android platform (PROD-041.4.3)', async () => {
      const androidToken = { ...mockPushToken, platform: PushPlatform.ANDROID };
      (prismaService.pushToken.upsert as jest.Mock).mockResolvedValue(androidToken);

      const result = await service.registerToken('user-123', {
        ...mockRegisterDto,
        platform: PushPlatform.ANDROID,
      });

      expect(result.platform).toBe(PushPlatform.ANDROID);
    });

    it('should handle Web platform (PROD-041.4.4)', async () => {
      const webToken = { ...mockPushToken, platform: PushPlatform.WEB };
      (prismaService.pushToken.upsert as jest.Mock).mockResolvedValue(webToken);

      const result = await service.registerToken('user-123', {
        ...mockRegisterDto,
        platform: PushPlatform.WEB,
      });

      expect(result.platform).toBe(PushPlatform.WEB);
    });
  });

  describe('getTokensForUser', () => {
    it('should return all active tokens for a user (PROD-041.4.5)', async () => {
      const tokens = [mockPushToken, { ...mockPushToken, id: 'token-456', platform: PushPlatform.ANDROID }];
      (prismaService.pushToken.findMany as jest.Mock).mockResolvedValue(tokens);

      const result = await service.getTokensForUser('user-123');

      expect(prismaService.pushToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no tokens (PROD-041.4.6)', async () => {
      (prismaService.pushToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getTokensForUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('unregisterToken', () => {
    it('should deactivate token by ID (PROD-041.4.7)', async () => {
      (prismaService.pushToken.findUnique as jest.Mock).mockResolvedValue(mockPushToken);
      (prismaService.pushToken.update as jest.Mock).mockResolvedValue({ ...mockPushToken, isActive: false });

      await service.unregisterToken('user-123', 'token-123');

      expect(prismaService.pushToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if token not found (PROD-041.4.8)', async () => {
      (prismaService.pushToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.unregisterToken('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if token belongs to different user (PROD-041.4.9)', async () => {
      (prismaService.pushToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockPushToken,
        userId: 'other-user',
      });

      await expect(service.unregisterToken('user-123', 'token-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unregisterTokenByValue', () => {
    it('should deactivate token by value (PROD-041.4.10)', async () => {
      (prismaService.pushToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.unregisterTokenByValue('user-123', 'fcm-device-token-abc123');

      expect(prismaService.pushToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', token: 'fcm-device-token-abc123' },
        data: { isActive: false },
      });
    });
  });

  describe('sendToUser', () => {
    it('should return 0 sent if no active tokens (PROD-041.4.11)', async () => {
      (prismaService.pushToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test message',
      });

      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('should send to all active tokens in mock mode (PROD-041.4.12)', async () => {
      const tokens = [mockPushToken, { ...mockPushToken, id: 'token-456', platform: PushPlatform.ANDROID }];
      (prismaService.pushToken.findMany as jest.Mock).mockResolvedValue(tokens);
      (prismaService.pushToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test message',
      });

      // In mock mode (no FCM key), all sends succeed
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should update lastUsedAt on successful send (PROD-041.4.13)', async () => {
      (prismaService.pushToken.findMany as jest.Mock).mockResolvedValue([mockPushToken]);
      (prismaService.pushToken.update as jest.Mock).mockResolvedValue({});

      await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test message',
      });

      expect(prismaService.pushToken.update).toHaveBeenCalledWith({
        where: { id: mockPushToken.id },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should include data payload in notification (PROD-041.4.14)', async () => {
      (prismaService.pushToken.findMany as jest.Mock).mockResolvedValue([mockPushToken]);
      (prismaService.pushToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUser('user-123', {
        title: 'New Match',
        body: 'A property matches your search',
        data: { type: 'SEARCH_AGENT_MATCH', propertyId: 'prop-123' },
      });

      expect(result.sent).toBe(1);
    });
  });

  describe('sendToUsers', () => {
    it('should send to multiple users (PROD-041.4.15)', async () => {
      (prismaService.pushToken.findMany as jest.Mock)
        .mockResolvedValueOnce([mockPushToken])
        .mockResolvedValueOnce([{ ...mockPushToken, id: 'token-456', userId: 'user-456' }]);
      (prismaService.pushToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUsers(['user-123', 'user-456'], {
        title: 'Broadcast',
        body: 'Message to all',
      });

      expect(result.sent).toBe(2);
    });

    it('should aggregate results from multiple users (PROD-041.4.16)', async () => {
      (prismaService.pushToken.findMany as jest.Mock)
        .mockResolvedValueOnce([mockPushToken, { ...mockPushToken, id: 'token-456' }])
        .mockResolvedValueOnce([]);
      (prismaService.pushToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUsers(['user-123', 'user-456'], {
        title: 'Test',
        body: 'Test',
      });

      expect(result.sent).toBe(2);
    });
  });

  describe('cleanupInactiveTokens', () => {
    it('should delete old inactive tokens (PROD-041.4.17)', async () => {
      (prismaService.pushToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.cleanupInactiveTokens(90);

      expect(prismaService.pushToken.deleteMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          updatedAt: { lt: expect.any(Date) },
        },
      });
      expect(result).toBe(5);
    });

    it('should use default 90 days if not specified (PROD-041.4.18)', async () => {
      (prismaService.pushToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.cleanupInactiveTokens();

      expect(prismaService.pushToken.deleteMany).toHaveBeenCalled();
    });
  });
});
