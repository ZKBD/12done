import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole } from '@prisma/client';
import { MediaService } from './media.service';
import { PrismaService } from '@/database';

describe('MediaService', () => {
  let service: MediaService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProperty = {
    id: 'property-123',
    ownerId: 'owner-123',
    status: PropertyStatus.ACTIVE,
  };

  const mockMedia = {
    id: 'media-123',
    propertyId: 'property-123',
    type: 'IMAGE',
    url: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    caption: 'Living room',
    sortOrder: 0,
    isPrimary: true,
    createdAt: new Date(),
  };

  const mockMedia2 = {
    id: 'media-456',
    propertyId: 'property-123',
    type: 'IMAGE',
    url: 'https://example.com/image2.jpg',
    thumbnailUrl: null,
    caption: null,
    sortOrder: 1,
    isPrimary: false,
    createdAt: new Date(),
  };

  const mockFloorPlan = {
    id: 'plan-123',
    propertyId: 'property-123',
    name: 'Ground Floor',
    imageUrl: 'https://example.com/floor1.jpg',
    sortOrder: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            propertyMedia: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
            floorPlan: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============ PROPERTY MEDIA TESTS ============

  describe('addMedia', () => {
    const createDto = {
      type: 'IMAGE',
      url: 'https://example.com/new-image.jpg',
      thumbnailUrl: 'https://example.com/new-thumb.jpg',
      caption: 'New image',
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addMedia('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.addMedia('property-123', createDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to add media for any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.propertyMedia.create as jest.Mock).mockResolvedValue(mockMedia);

      const result = await service.addMedia(
        'property-123',
        createDto,
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockMedia.id);
    });

    it('should throw BadRequestException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.addMedia('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add media successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.propertyMedia.create as jest.Mock).mockResolvedValue(mockMedia);

      const result = await service.addMedia(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockMedia.id);
      expect(result.type).toBe('IMAGE');
      expect(result.url).toBe(mockMedia.url);
    });

    it('should unset existing primary when adding new primary', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.propertyMedia.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.propertyMedia.create as jest.Mock).mockResolvedValue({
        ...mockMedia,
        isPrimary: true,
      });

      await service.addMedia(
        'property-123',
        { ...createDto, isPrimary: true },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.propertyMedia.updateMany).toHaveBeenCalledWith({
        where: { propertyId: 'property-123', isPrimary: true },
        data: { isPrimary: false },
      });
    });

    it('should auto-assign sort order when not specified', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue({
        sortOrder: 2,
      });
      (prismaService.propertyMedia.create as jest.Mock).mockResolvedValue({
        ...mockMedia,
        sortOrder: 3,
      });

      await service.addMedia('property-123', createDto, 'owner-123', UserRole.USER);

      expect(prismaService.propertyMedia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 3,
          }),
        }),
      );
    });

    it('should use specified sort order', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.create as jest.Mock).mockResolvedValue({
        ...mockMedia,
        sortOrder: 5,
      });

      await service.addMedia(
        'property-123',
        { ...createDto, sortOrder: 5 },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.propertyMedia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 5,
          }),
        }),
      );
    });

    it('should start sort order at 0 when no existing media', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.propertyMedia.create as jest.Mock).mockResolvedValue({
        ...mockMedia,
        sortOrder: 0,
      });

      await service.addMedia('property-123', createDto, 'owner-123', UserRole.USER);

      expect(prismaService.propertyMedia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 0,
          }),
        }),
      );
    });
  });

  describe('getMedia', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMedia('property-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(service.getMedia('property-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all media for property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([
        mockMedia,
        mockMedia2,
      ]);

      const result = await service.getMedia('property-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockMedia.id);
      expect(result[1].id).toBe(mockMedia2.id);
    });

    it('should order by sortOrder ascending', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([]);

      await service.getMedia('property-123');

      expect(prismaService.propertyMedia.findMany).toHaveBeenCalledWith({
        where: { propertyId: 'property-123' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return empty array when no media', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getMedia('property-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateMedia', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateMedia(
          'property-123',
          'media-123',
          { caption: 'Updated' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateMedia(
          'property-123',
          'media-123',
          { caption: 'Updated' },
          'other-user',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if media not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateMedia(
          'property-123',
          'media-123',
          { caption: 'Updated' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update caption', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(mockMedia);
      (prismaService.propertyMedia.update as jest.Mock).mockResolvedValue({
        ...mockMedia,
        caption: 'Updated caption',
      });

      const result = await service.updateMedia(
        'property-123',
        'media-123',
        { caption: 'Updated caption' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.caption).toBe('Updated caption');
    });

    it('should update sortOrder', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(mockMedia);
      (prismaService.propertyMedia.update as jest.Mock).mockResolvedValue({
        ...mockMedia,
        sortOrder: 5,
      });

      const result = await service.updateMedia(
        'property-123',
        'media-123',
        { sortOrder: 5 },
        'owner-123',
        UserRole.USER,
      );

      expect(result.sortOrder).toBe(5);
    });

    it('should unset other primary when setting isPrimary', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(mockMedia2);
      (prismaService.propertyMedia.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.propertyMedia.update as jest.Mock).mockResolvedValue({
        ...mockMedia2,
        isPrimary: true,
      });

      await service.updateMedia(
        'property-123',
        'media-456',
        { isPrimary: true },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.propertyMedia.updateMany).toHaveBeenCalledWith({
        where: { propertyId: 'property-123', isPrimary: true, id: { not: 'media-456' } },
        data: { isPrimary: false },
      });
    });
  });

  describe('deleteMedia', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteMedia('property-123', 'media-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.deleteMedia('property-123', 'media-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if media not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteMedia('property-123', 'media-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete media successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockMedia2) // First call for delete check
        .mockResolvedValueOnce(null); // No remaining media to make primary
      (prismaService.propertyMedia.delete as jest.Mock).mockResolvedValue(mockMedia2);

      const result = await service.deleteMedia(
        'property-123',
        'media-456',
        'owner-123',
        UserRole.USER,
      );

      expect(result.message).toContain('deleted');
      expect(prismaService.propertyMedia.delete).toHaveBeenCalledWith({
        where: { id: 'media-456' },
      });
    });

    it('should make first remaining media primary when deleting primary', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockMedia) // Primary media being deleted
        .mockResolvedValueOnce(mockMedia2); // First remaining media
      (prismaService.propertyMedia.delete as jest.Mock).mockResolvedValue(mockMedia);
      (prismaService.propertyMedia.update as jest.Mock).mockResolvedValue({
        ...mockMedia2,
        isPrimary: true,
      });

      await service.deleteMedia('property-123', 'media-123', 'owner-123', UserRole.USER);

      expect(prismaService.propertyMedia.update).toHaveBeenCalledWith({
        where: { id: 'media-456' },
        data: { isPrimary: true },
      });
    });

    it('should not update primary when no remaining media', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockMedia) // Primary media being deleted
        .mockResolvedValueOnce(null); // No remaining media
      (prismaService.propertyMedia.delete as jest.Mock).mockResolvedValue(mockMedia);

      await service.deleteMedia('property-123', 'media-123', 'owner-123', UserRole.USER);

      expect(prismaService.propertyMedia.update).not.toHaveBeenCalled();
    });

    it('should allow admin to delete media', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockMedia2)
        .mockResolvedValueOnce(null);
      (prismaService.propertyMedia.delete as jest.Mock).mockResolvedValue(mockMedia2);

      const result = await service.deleteMedia(
        'property-123',
        'media-456',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.message).toContain('deleted');
    });
  });

  describe('reorderMedia', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.reorderMedia(
          'property-123',
          { mediaIds: ['media-456', 'media-123'] },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.reorderMedia(
          'property-123',
          { mediaIds: ['media-456', 'media-123'] },
          'other-user',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reorder media successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([
        { ...mockMedia2, sortOrder: 0 },
        { ...mockMedia, sortOrder: 1 },
      ]);

      const result = await service.reorderMedia(
        'property-123',
        { mediaIds: ['media-456', 'media-123'] },
        'owner-123',
        UserRole.USER,
      );

      expect(result).toHaveLength(2);
      expect(prismaService.propertyMedia.updateMany).toHaveBeenCalledTimes(2);
      expect(prismaService.propertyMedia.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'media-456', propertyId: 'property-123' },
        data: { sortOrder: 0 },
      });
      expect(prismaService.propertyMedia.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'media-123', propertyId: 'property-123' },
        data: { sortOrder: 1 },
      });
    });
  });

  describe('setPrimaryMedia', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setPrimaryMedia('property-123', 'media-456', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.setPrimaryMedia('property-123', 'media-456', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if media not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setPrimaryMedia('property-123', 'media-999', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set media as primary', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findFirst as jest.Mock).mockResolvedValue(mockMedia2);
      (prismaService.propertyMedia.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.propertyMedia.update as jest.Mock).mockResolvedValue({
        ...mockMedia2,
        isPrimary: true,
      });

      const result = await service.setPrimaryMedia(
        'property-123',
        'media-456',
        'owner-123',
        UserRole.USER,
      );

      expect(result.isPrimary).toBe(true);
      expect(prismaService.propertyMedia.updateMany).toHaveBeenCalledWith({
        where: { propertyId: 'property-123', isPrimary: true },
        data: { isPrimary: false },
      });
      expect(prismaService.propertyMedia.update).toHaveBeenCalledWith({
        where: { id: 'media-456' },
        data: { isPrimary: true },
      });
    });
  });

  // ============ FLOOR PLAN TESTS ============

  describe('addFloorPlan', () => {
    const createDto = {
      name: 'First Floor',
      imageUrl: 'https://example.com/floor.jpg',
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addFloorPlan('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.addFloorPlan('property-123', createDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should add floor plan successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.floorPlan.create as jest.Mock).mockResolvedValue(mockFloorPlan);

      const result = await service.addFloorPlan(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockFloorPlan.id);
      expect(result.name).toBe(mockFloorPlan.name);
    });

    it('should auto-assign sort order when not specified', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue({ sortOrder: 1 });
      (prismaService.floorPlan.create as jest.Mock).mockResolvedValue({
        ...mockFloorPlan,
        sortOrder: 2,
      });

      await service.addFloorPlan('property-123', createDto, 'owner-123', UserRole.USER);

      expect(prismaService.floorPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 2,
          }),
        }),
      );
    });

    it('should use specified sort order', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.create as jest.Mock).mockResolvedValue({
        ...mockFloorPlan,
        sortOrder: 5,
      });

      await service.addFloorPlan(
        'property-123',
        { ...createDto, sortOrder: 5 },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.floorPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 5,
          }),
        }),
      );
    });

    it('should allow admin to add floor plan', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.floorPlan.create as jest.Mock).mockResolvedValue(mockFloorPlan);

      const result = await service.addFloorPlan(
        'property-123',
        createDto,
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockFloorPlan.id);
    });
  });

  describe('getFloorPlans', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getFloorPlans('property-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(service.getFloorPlans('property-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all floor plans for property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findMany as jest.Mock).mockResolvedValue([
        mockFloorPlan,
        { ...mockFloorPlan, id: 'plan-456', name: 'Second Floor', sortOrder: 1 },
      ]);

      const result = await service.getFloorPlans('property-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ground Floor');
      expect(result[1].name).toBe('Second Floor');
    });

    it('should order by sortOrder ascending', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findMany as jest.Mock).mockResolvedValue([]);

      await service.getFloorPlans('property-123');

      expect(prismaService.floorPlan.findMany).toHaveBeenCalledWith({
        where: { propertyId: 'property-123' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return empty array when no floor plans', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getFloorPlans('property-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateFloorPlan', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateFloorPlan(
          'property-123',
          'plan-123',
          { name: 'Updated' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateFloorPlan(
          'property-123',
          'plan-123',
          { name: 'Updated' },
          'other-user',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if floor plan not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateFloorPlan(
          'property-123',
          'plan-123',
          { name: 'Updated' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update name', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(mockFloorPlan);
      (prismaService.floorPlan.update as jest.Mock).mockResolvedValue({
        ...mockFloorPlan,
        name: 'Updated Name',
      });

      const result = await service.updateFloorPlan(
        'property-123',
        'plan-123',
        { name: 'Updated Name' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should update imageUrl', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(mockFloorPlan);
      (prismaService.floorPlan.update as jest.Mock).mockResolvedValue({
        ...mockFloorPlan,
        imageUrl: 'https://example.com/new-floor.jpg',
      });

      const result = await service.updateFloorPlan(
        'property-123',
        'plan-123',
        { imageUrl: 'https://example.com/new-floor.jpg' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.imageUrl).toBe('https://example.com/new-floor.jpg');
    });

    it('should update sortOrder', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(mockFloorPlan);
      (prismaService.floorPlan.update as jest.Mock).mockResolvedValue({
        ...mockFloorPlan,
        sortOrder: 3,
      });

      const result = await service.updateFloorPlan(
        'property-123',
        'plan-123',
        { sortOrder: 3 },
        'owner-123',
        UserRole.USER,
      );

      expect(result.sortOrder).toBe(3);
    });
  });

  describe('deleteFloorPlan', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteFloorPlan('property-123', 'plan-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.deleteFloorPlan('property-123', 'plan-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if floor plan not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteFloorPlan('property-123', 'plan-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete floor plan successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(mockFloorPlan);
      (prismaService.floorPlan.delete as jest.Mock).mockResolvedValue(mockFloorPlan);

      const result = await service.deleteFloorPlan(
        'property-123',
        'plan-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.message).toContain('deleted');
      expect(prismaService.floorPlan.delete).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
      });
    });

    it('should allow admin to delete floor plan', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findFirst as jest.Mock).mockResolvedValue(mockFloorPlan);
      (prismaService.floorPlan.delete as jest.Mock).mockResolvedValue(mockFloorPlan);

      const result = await service.deleteFloorPlan(
        'property-123',
        'plan-123',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.message).toContain('deleted');
    });
  });

  // ============ RESPONSE MAPPING TESTS ============

  describe('response mapping', () => {
    it('should correctly map media to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([mockMedia]);

      const result = await service.getMedia('property-123');

      expect(result[0].id).toBe(mockMedia.id);
      expect(result[0].type).toBe(mockMedia.type);
      expect(result[0].url).toBe(mockMedia.url);
      expect(result[0].thumbnailUrl).toBe(mockMedia.thumbnailUrl);
      expect(result[0].caption).toBe(mockMedia.caption);
      expect(result[0].sortOrder).toBe(mockMedia.sortOrder);
      expect(result[0].isPrimary).toBe(mockMedia.isPrimary);
    });

    it('should handle null thumbnailUrl in media', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([mockMedia2]);

      const result = await service.getMedia('property-123');

      expect(result[0].thumbnailUrl).toBeUndefined();
    });

    it('should handle null caption in media', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.propertyMedia.findMany as jest.Mock).mockResolvedValue([mockMedia2]);

      const result = await service.getMedia('property-123');

      expect(result[0].caption).toBeUndefined();
    });

    it('should correctly map floor plan to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.floorPlan.findMany as jest.Mock).mockResolvedValue([mockFloorPlan]);

      const result = await service.getFloorPlans('property-123');

      expect(result[0].id).toBe(mockFloorPlan.id);
      expect(result[0].name).toBe(mockFloorPlan.name);
      expect(result[0].imageUrl).toBe(mockFloorPlan.imageUrl);
      expect(result[0].sortOrder).toBe(mockFloorPlan.sortOrder);
      expect(result[0].createdAt).toBe(mockFloorPlan.createdAt);
    });
  });
});
