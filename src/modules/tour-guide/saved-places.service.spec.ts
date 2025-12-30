import { Test, TestingModule } from '@nestjs/testing';
import { SavedPlacesService } from './saved-places.service';
import { PrismaService } from '@/database/prisma.service';
import { PoiType } from '@prisma/client';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('SavedPlacesService', () => {
  let service: SavedPlacesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    savedPlace: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockSavedPlace = {
    id: 'saved-123',
    userId: 'user-123',
    placeId: 'place-123',
    placeName: 'Test Place',
    placeType: PoiType.LANDMARK,
    latitude: 47.4979,
    longitude: 19.0402,
    address: '123 Test St',
    notes: 'Great view!',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedPlacesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SavedPlacesService>(SavedPlacesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('savePlace', () => {
    it('should save a new place', async () => {
      mockPrismaService.savedPlace.findUnique.mockResolvedValue(null);
      mockPrismaService.savedPlace.create.mockResolvedValue(mockSavedPlace);

      const result = await service.savePlace('user-123', {
        placeId: 'place-123',
        placeName: 'Test Place',
        placeType: PoiType.LANDMARK,
        latitude: 47.4979,
        longitude: 19.0402,
      });

      expect(result).toBeDefined();
      expect(result.placeId).toBe('place-123');
      expect(mockPrismaService.savedPlace.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if place already saved', async () => {
      mockPrismaService.savedPlace.findUnique.mockResolvedValue(mockSavedPlace);

      await expect(
        service.savePlace('user-123', {
          placeId: 'place-123',
          placeName: 'Test Place',
          latitude: 47.4979,
          longitude: 19.0402,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getSavedPlaces', () => {
    it('should return user saved places', async () => {
      mockPrismaService.savedPlace.findMany.mockResolvedValue([mockSavedPlace]);

      const result = await service.getSavedPlaces('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].placeId).toBe('place-123');
    });

    it('should filter by type', async () => {
      mockPrismaService.savedPlace.findMany.mockResolvedValue([mockSavedPlace]);

      await service.getSavedPlaces('user-123', { type: PoiType.LANDMARK });

      expect(mockPrismaService.savedPlace.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ placeType: PoiType.LANDMARK }),
        }),
      );
    });

    it('should apply limit and offset', async () => {
      mockPrismaService.savedPlace.findMany.mockResolvedValue([]);

      await service.getSavedPlaces('user-123', { limit: 10, offset: 5 });

      expect(mockPrismaService.savedPlace.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getSavedPlace', () => {
    it('should return a saved place by ID', async () => {
      mockPrismaService.savedPlace.findFirst.mockResolvedValue(mockSavedPlace);

      const result = await service.getSavedPlace('user-123', 'saved-123');

      expect(result.id).toBe('saved-123');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.savedPlace.findFirst.mockResolvedValue(null);

      await expect(
        service.getSavedPlace('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isPlaceSaved', () => {
    it('should return true if place is saved', async () => {
      mockPrismaService.savedPlace.count.mockResolvedValue(1);

      const result = await service.isPlaceSaved('user-123', 'place-123');

      expect(result).toBe(true);
    });

    it('should return false if place is not saved', async () => {
      mockPrismaService.savedPlace.count.mockResolvedValue(0);

      const result = await service.isPlaceSaved('user-123', 'place-456');

      expect(result).toBe(false);
    });
  });

  describe('updateSavedPlace', () => {
    it('should update notes', async () => {
      mockPrismaService.savedPlace.findFirst.mockResolvedValue(mockSavedPlace);
      mockPrismaService.savedPlace.update.mockResolvedValue({
        ...mockSavedPlace,
        notes: 'Updated notes',
      });

      const result = await service.updateSavedPlace('user-123', 'saved-123', {
        notes: 'Updated notes',
      });

      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.savedPlace.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSavedPlace('user-123', 'non-existent', { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSavedPlace', () => {
    it('should remove a saved place', async () => {
      mockPrismaService.savedPlace.findFirst.mockResolvedValue(mockSavedPlace);
      mockPrismaService.savedPlace.delete.mockResolvedValue(mockSavedPlace);

      await expect(
        service.removeSavedPlace('user-123', 'saved-123'),
      ).resolves.not.toThrow();

      expect(mockPrismaService.savedPlace.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.savedPlace.findFirst.mockResolvedValue(null);

      await expect(
        service.removeSavedPlace('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSavedPlacesCount', () => {
    it('should return count of saved places', async () => {
      mockPrismaService.savedPlace.count.mockResolvedValue(5);

      const result = await service.getSavedPlacesCount('user-123');

      expect(result).toBe(5);
    });
  });
});
