import { Test, TestingModule } from '@nestjs/testing';
import { VirtualStagingService } from './virtual-staging.service';
import { PrismaService } from '@/database/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RoomType, StagingStyle, StagingStatus, UserRole } from '@prisma/client';

describe('VirtualStagingService', () => {
  let service: VirtualStagingService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockPropertyId = 'property-123';
  const mockMediaId = 'media-123';
  const mockRequestId = 'request-123';

  const mockProperty = {
    id: mockPropertyId,
    ownerId: mockUserId,
    title: 'Test Property',
  };

  const mockMedia = {
    id: mockMediaId,
    propertyId: mockPropertyId,
    type: 'photo',
    url: 'https://example.com/photo.jpg',
    thumbnailUrl: null,
    caption: null,
    sortOrder: 0,
    isPrimary: false,
    isVirtuallyStaged: false,
    roomType: null,
    stagingStyle: null,
    originalMediaId: null,
    createdAt: new Date(),
  };

  const mockStagingRequest = {
    id: mockRequestId,
    propertyId: mockPropertyId,
    originalMediaId: mockMediaId,
    roomType: RoomType.LIVING_ROOM,
    style: StagingStyle.MODERN,
    status: StagingStatus.PENDING,
    stagedMediaId: null,
    stagedUrl: null,
    errorMessage: null,
    requestedById: mockUserId,
    providerName: 'MockProvider',
    createdAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualStagingService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            propertyMedia: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            virtualStagingRequest: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<VirtualStagingService>(VirtualStagingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createStagingRequest', () => {
    const createDto = {
      mediaId: mockMediaId,
      roomType: RoomType.LIVING_ROOM,
      style: StagingStyle.MODERN,
    };

    it('should create staging request and process it', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValueOnce(mockMedia as any)
        .mockResolvedValueOnce(mockMedia as any);
      jest.spyOn(prismaService.virtualStagingRequest, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.virtualStagingRequest, 'create')
        .mockResolvedValue(mockStagingRequest as any);
      // Mock findUnique for processStaging lookup
      jest
        .spyOn(prismaService.virtualStagingRequest, 'findUnique')
        .mockResolvedValue(mockStagingRequest as any);
      jest.spyOn(prismaService.virtualStagingRequest, 'update').mockResolvedValue({
        ...mockStagingRequest,
        status: StagingStatus.COMPLETED,
        stagedUrl: 'https://example.com/staged.jpg',
        stagedMediaId: 'staged-media-123',
        completedAt: new Date(),
      } as any);
      jest.spyOn(prismaService.propertyMedia, 'create').mockResolvedValue({
        ...mockMedia,
        id: 'staged-media-123',
        isVirtuallyStaged: true,
        roomType: RoomType.LIVING_ROOM,
        stagingStyle: StagingStyle.MODERN,
        originalMediaId: mockMediaId,
      } as any);

      const result = await service.createStagingRequest(
        mockPropertyId,
        mockUserId,
        UserRole.USER,
        createDto,
      );

      expect(result.status).toBe(StagingStatus.COMPLETED);
      expect(result.roomType).toBe(RoomType.LIVING_ROOM);
      expect(result.style).toBe(StagingStyle.MODERN);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createStagingRequest(mockPropertyId, mockUserId, UserRole.USER, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not owner', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.createStagingRequest(mockPropertyId, mockUserId, UserRole.USER, createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to create staging request', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValueOnce(mockMedia as any)
        .mockResolvedValueOnce(mockMedia as any);
      jest.spyOn(prismaService.virtualStagingRequest, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.virtualStagingRequest, 'create')
        .mockResolvedValue(mockStagingRequest as any);
      // Mock findUnique for processStaging lookup
      jest
        .spyOn(prismaService.virtualStagingRequest, 'findUnique')
        .mockResolvedValue(mockStagingRequest as any);
      jest.spyOn(prismaService.virtualStagingRequest, 'update').mockResolvedValue({
        ...mockStagingRequest,
        status: StagingStatus.COMPLETED,
      } as any);
      jest.spyOn(prismaService.propertyMedia, 'create').mockResolvedValue({
        ...mockMedia,
        isVirtuallyStaged: true,
      } as any);

      const result = await service.createStagingRequest(
        mockPropertyId,
        mockUserId,
        UserRole.ADMIN,
        createDto,
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if media not found', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createStagingRequest(mockPropertyId, mockUserId, UserRole.USER, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if media does not belong to property', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue({
        ...mockMedia,
        propertyId: 'other-property',
      } as any);

      await expect(
        service.createStagingRequest(mockPropertyId, mockUserId, UserRole.USER, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if media is not a photo', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue({
        ...mockMedia,
        type: 'video',
      } as any);

      await expect(
        service.createStagingRequest(mockPropertyId, mockUserId, UserRole.USER, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if staging request already in progress', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockMedia as any);
      jest
        .spyOn(prismaService.virtualStagingRequest, 'findFirst')
        .mockResolvedValue(mockStagingRequest as any);

      await expect(
        service.createStagingRequest(mockPropertyId, mockUserId, UserRole.USER, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStagingRequest', () => {
    it('should return staging request', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.virtualStagingRequest, 'findUnique')
        .mockResolvedValue(mockStagingRequest as any);

      const result = await service.getStagingRequest(
        mockPropertyId,
        mockRequestId,
        mockUserId,
        UserRole.USER,
      );

      expect(result.id).toBe(mockRequestId);
      expect(result.roomType).toBe(RoomType.LIVING_ROOM);
    });

    it('should throw NotFoundException if request not found', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.virtualStagingRequest, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getStagingRequest(mockPropertyId, mockRequestId, mockUserId, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not authorized', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.getStagingRequest(mockPropertyId, mockRequestId, mockUserId, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStagingRequests', () => {
    it('should return all staging requests for property', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.virtualStagingRequest, 'findMany')
        .mockResolvedValue([mockStagingRequest] as any);

      const result = await service.getStagingRequests(
        mockPropertyId,
        mockUserId,
        UserRole.USER,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockRequestId);
    });
  });

  describe('getStagedMedia', () => {
    const mockStagedMedia = {
      ...mockMedia,
      id: 'staged-media-123',
      isVirtuallyStaged: true,
      roomType: RoomType.LIVING_ROOM,
      stagingStyle: StagingStyle.MODERN,
      originalMediaId: mockMediaId,
    };

    it('should return all staged media for property', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue([mockStagedMedia] as any);

      const result = await service.getStagedMedia(mockPropertyId);

      expect(result).toHaveLength(1);
      expect(result[0].isVirtuallyStaged).toBe(true);
      expect(result[0].roomType).toBe(RoomType.LIVING_ROOM);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(service.getStagedMedia(mockPropertyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteStagedMedia', () => {
    const mockStagedMedia = {
      ...mockMedia,
      isVirtuallyStaged: true,
    };

    it('should delete staged media', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockStagedMedia as any);
      jest.spyOn(prismaService.propertyMedia, 'delete').mockResolvedValue({} as any);

      const result = await service.deleteStagedMedia(
        mockPropertyId,
        mockMediaId,
        mockUserId,
        UserRole.USER,
      );

      expect(result.message).toBe('Staged media deleted successfully');
      expect(prismaService.propertyMedia.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException if media is not staged', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockMedia as any);

      await expect(
        service.deleteStagedMedia(mockPropertyId, mockMediaId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('compareImages', () => {
    const mockStagedMedia = {
      ...mockMedia,
      id: 'staged-media-123',
      isVirtuallyStaged: true,
      originalMediaId: mockMediaId,
    };

    it('should return original and staged images', async () => {
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValueOnce(mockStagedMedia as any)
        .mockResolvedValueOnce(mockMedia as any);

      const result = await service.compareImages(mockPropertyId, 'staged-media-123');

      expect(result.original.id).toBe(mockMediaId);
      expect(result.staged.id).toBe('staged-media-123');
      expect(result.staged.isVirtuallyStaged).toBe(true);
    });

    it('should throw BadRequestException if media is not staged', async () => {
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockMedia as any);

      await expect(
        service.compareImages(mockPropertyId, mockMediaId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if original media not found', async () => {
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValueOnce(mockStagedMedia as any)
        .mockResolvedValueOnce(null);

      await expect(
        service.compareImages(mockPropertyId, 'staged-media-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
