import { Test, TestingModule } from '@nestjs/testing';
import { TimeOfDayPhotosService } from './time-of-day-photos.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TimeOfDay, Season, UserRole } from '@prisma/client';

describe('TimeOfDayPhotosService', () => {
  let service: TimeOfDayPhotosService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockPropertyId = 'property-123';
  const mockMediaId = 'media-123';
  const mockGroupId = 'property-123-exterior-front';

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
    timeOfDay: null,
    season: null,
    photoGroupId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOfDayPhotosService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            propertyMedia: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TimeOfDayPhotosService>(TimeOfDayPhotosService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('tagMedia', () => {
    const tagDto = {
      timeOfDay: TimeOfDay.MORNING,
      season: Season.SUMMER,
    };

    it('should tag media with time of day and season', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockMedia as any);
      jest.spyOn(prismaService.propertyMedia, 'update').mockResolvedValue({
        ...mockMedia,
        timeOfDay: TimeOfDay.MORNING,
        season: Season.SUMMER,
      } as any);

      const result = await service.tagMedia(
        mockPropertyId,
        mockMediaId,
        mockUserId,
        UserRole.USER,
        tagDto,
      );

      expect(result.timeOfDay).toBe(TimeOfDay.MORNING);
      expect(result.season).toBe(Season.SUMMER);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.tagMedia(mockPropertyId, mockMediaId, mockUserId, UserRole.USER, tagDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not owner', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.tagMedia(mockPropertyId, mockMediaId, mockUserId, UserRole.USER, tagDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to tag media', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockMedia as any);
      jest.spyOn(prismaService.propertyMedia, 'update').mockResolvedValue({
        ...mockMedia,
        timeOfDay: TimeOfDay.MORNING,
      } as any);

      const result = await service.tagMedia(
        mockPropertyId,
        mockMediaId,
        mockUserId,
        UserRole.ADMIN,
        tagDto,
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if media not found', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue(null);

      await expect(
        service.tagMedia(mockPropertyId, mockMediaId, mockUserId, UserRole.USER, tagDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if media belongs to different property', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue({
        ...mockMedia,
        propertyId: 'other-property',
      } as any);

      await expect(
        service.tagMedia(mockPropertyId, mockMediaId, mockUserId, UserRole.USER, tagDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPhotoGroup', () => {
    it('should create a photo group', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);

      const result = await service.createPhotoGroup(
        mockPropertyId,
        mockUserId,
        UserRole.USER,
        'Exterior Front',
      );

      expect(result.groupId).toBe('property-123-exterior-front');
      expect(result.name).toBe('Exterior Front');
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createPhotoGroup(mockPropertyId, mockUserId, UserRole.USER, 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not owner', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.createPhotoGroup(mockPropertyId, mockUserId, UserRole.USER, 'Test'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addToGroup', () => {
    it('should add media to a photo group', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValue(mockMedia as any);
      jest.spyOn(prismaService.propertyMedia, 'update').mockResolvedValue({
        ...mockMedia,
        photoGroupId: mockGroupId,
      } as any);

      const result = await service.addToGroup(
        mockPropertyId,
        mockMediaId,
        mockGroupId,
        mockUserId,
        UserRole.USER,
      );

      expect(result.photoGroupId).toBe(mockGroupId);
    });

    it('should throw NotFoundException if media not found', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue(null);

      await expect(
        service.addToGroup(mockPropertyId, mockMediaId, mockGroupId, mockUserId, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFromGroup', () => {
    it('should remove media from a photo group', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findUnique').mockResolvedValue({
        ...mockMedia,
        photoGroupId: mockGroupId,
      } as any);
      jest.spyOn(prismaService.propertyMedia, 'update').mockResolvedValue({
        ...mockMedia,
        photoGroupId: null,
      } as any);

      const result = await service.removeFromGroup(
        mockPropertyId,
        mockMediaId,
        mockUserId,
        UserRole.USER,
      );

      expect(result.photoGroupId).toBeNull();
    });
  });

  describe('getPhotoGroups', () => {
    const mockGroupedMedia = [
      {
        ...mockMedia,
        id: 'media-1',
        photoGroupId: mockGroupId,
        timeOfDay: TimeOfDay.MORNING,
        season: Season.SUMMER,
      },
      {
        ...mockMedia,
        id: 'media-2',
        photoGroupId: mockGroupId,
        timeOfDay: TimeOfDay.DUSK,
        season: Season.SUMMER,
      },
    ];

    it('should return all photo groups for property', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue(mockGroupedMedia as any);

      const result = await service.getPhotoGroups(mockPropertyId);

      expect(result).toHaveLength(1);
      expect(result[0].groupId).toBe(mockGroupId);
      expect(result[0].photos).toHaveLength(2);
      expect(result[0].timesOfDay).toContain(TimeOfDay.MORNING);
      expect(result[0].timesOfDay).toContain(TimeOfDay.DUSK);
      expect(result[0].seasons).toContain(Season.SUMMER);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(service.getPhotoGroups(mockPropertyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPhotoGroup', () => {
    const mockGroupMedia = [
      {
        ...mockMedia,
        id: 'media-1',
        photoGroupId: mockGroupId,
        timeOfDay: TimeOfDay.MORNING,
        season: Season.SUMMER,
      },
      {
        ...mockMedia,
        id: 'media-2',
        photoGroupId: mockGroupId,
        timeOfDay: TimeOfDay.DUSK,
        season: null,
      },
    ];

    it('should return a specific photo group', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue(mockGroupMedia as any);

      const result = await service.getPhotoGroup(mockPropertyId, mockGroupId);

      expect(result.groupId).toBe(mockGroupId);
      expect(result.photos).toHaveLength(2);
      expect(result.timesOfDay).toContain(TimeOfDay.MORNING);
      expect(result.timesOfDay).toContain(TimeOfDay.DUSK);
      expect(result.seasons).toContain(Season.SUMMER);
    });

    it('should throw NotFoundException if group is empty', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.propertyMedia, 'findMany').mockResolvedValue([]);

      await expect(
        service.getPhotoGroup(mockPropertyId, mockGroupId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTimeTaggedMedia', () => {
    it('should return all time-tagged media', async () => {
      const mockTaggedMedia = [
        { ...mockMedia, id: 'media-1', timeOfDay: TimeOfDay.MORNING },
        { ...mockMedia, id: 'media-2', season: Season.FALL },
      ];

      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue(mockTaggedMedia as any);

      const result = await service.getTimeTaggedMedia(mockPropertyId);

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(service.getTimeTaggedMedia(mockPropertyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMediaByTimeOfDay', () => {
    it('should return media filtered by time of day', async () => {
      const mockMorningMedia = [
        { ...mockMedia, id: 'media-1', timeOfDay: TimeOfDay.MORNING },
        { ...mockMedia, id: 'media-2', timeOfDay: TimeOfDay.MORNING },
      ];

      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue(mockMorningMedia as any);

      const result = await service.getMediaByTimeOfDay(
        mockPropertyId,
        TimeOfDay.MORNING,
      );

      expect(result).toHaveLength(2);
      expect(result[0].timeOfDay).toBe(TimeOfDay.MORNING);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getMediaByTimeOfDay(mockPropertyId, TimeOfDay.MORNING),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMediaBySeason', () => {
    it('should return media filtered by season', async () => {
      const mockSummerMedia = [
        { ...mockMedia, id: 'media-1', season: Season.SUMMER },
      ];

      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue(mockSummerMedia as any);

      const result = await service.getMediaBySeason(mockPropertyId, Season.SUMMER);

      expect(result).toHaveLength(1);
      expect(result[0].season).toBe(Season.SUMMER);
    });
  });

  describe('getSliderData', () => {
    const mockGroupMedia = [
      {
        ...mockMedia,
        id: 'media-1',
        photoGroupId: mockGroupId,
        timeOfDay: TimeOfDay.MORNING,
        season: Season.SUMMER,
      },
      {
        ...mockMedia,
        id: 'media-2',
        photoGroupId: mockGroupId,
        timeOfDay: TimeOfDay.DUSK,
        season: Season.WINTER,
      },
    ];

    it('should return slider data organized by time and season', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findMany')
        .mockResolvedValue(mockGroupMedia as any);

      const result = await service.getSliderData(mockPropertyId, mockGroupId);

      expect(result.groupId).toBe(mockGroupId);
      expect(result.timeSlider[TimeOfDay.MORNING]).not.toBeNull();
      expect(result.timeSlider[TimeOfDay.DUSK]).not.toBeNull();
      expect(result.timeSlider[TimeOfDay.NOON]).toBeNull();
      expect(result.seasonSlider[Season.SUMMER]).not.toBeNull();
      expect(result.seasonSlider[Season.WINTER]).not.toBeNull();
      expect(result.seasonSlider[Season.SPRING]).toBeNull();
    });
  });

  describe('bulkTagMedia', () => {
    it('should bulk tag multiple media items', async () => {
      const bulkItems = [
        { mediaId: 'media-1', timeOfDay: TimeOfDay.MORNING, season: Season.SUMMER },
        { mediaId: 'media-2', timeOfDay: TimeOfDay.DUSK },
      ];

      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValueOnce({ ...mockMedia, id: 'media-1' } as any)
        .mockResolvedValueOnce({ ...mockMedia, id: 'media-2' } as any);
      jest
        .spyOn(prismaService.propertyMedia, 'update')
        .mockResolvedValueOnce({
          ...mockMedia,
          id: 'media-1',
          timeOfDay: TimeOfDay.MORNING,
          season: Season.SUMMER,
        } as any)
        .mockResolvedValueOnce({
          ...mockMedia,
          id: 'media-2',
          timeOfDay: TimeOfDay.DUSK,
        } as any);

      const result = await service.bulkTagMedia(
        mockPropertyId,
        mockUserId,
        UserRole.USER,
        bulkItems,
      );

      expect(result).toHaveLength(2);
      expect(result[0].timeOfDay).toBe(TimeOfDay.MORNING);
      expect(result[1].timeOfDay).toBe(TimeOfDay.DUSK);
    });

    it('should skip invalid media items', async () => {
      const bulkItems = [
        { mediaId: 'media-1', timeOfDay: TimeOfDay.MORNING },
        { mediaId: 'invalid-media', timeOfDay: TimeOfDay.DUSK },
      ];

      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);
      jest
        .spyOn(prismaService.propertyMedia, 'findUnique')
        .mockResolvedValueOnce({ ...mockMedia, id: 'media-1' } as any)
        .mockResolvedValueOnce(null); // Invalid media
      jest.spyOn(prismaService.propertyMedia, 'update').mockResolvedValue({
        ...mockMedia,
        id: 'media-1',
        timeOfDay: TimeOfDay.MORNING,
      } as any);

      const result = await service.bulkTagMedia(
        mockPropertyId,
        mockUserId,
        UserRole.USER,
        bulkItems,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('media-1');
    });

    it('should throw ForbiddenException if user not owner', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.bulkTagMedia(mockPropertyId, mockUserId, UserRole.USER, []),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
