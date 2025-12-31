import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AmbientSoundsService } from './ambient-sounds.service';
import { PrismaService } from '@/database/prisma.service';
import { AmbientSoundCategory, PoiType } from '@prisma/client';

describe('AmbientSoundsService', () => {
  let service: AmbientSoundsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockSound = {
    id: 'sound-1',
    category: AmbientSoundCategory.BEACH,
    name: 'Ocean Waves',
    description: 'Relaxing ocean waves',
    audioUrl: 'https://example.com/waves.mp3',
    duration: 120,
    loopable: true,
    tags: ['waves', 'ocean', 'relaxing'],
    createdAt: new Date(),
  };

  const mockTourPreferences = {
    id: 'pref-1',
    userId: 'user-1',
    voiceStyle: 'FRIENDLY',
    language: 'en',
    interests: [],
    followMeEnabled: true,
    poiRadius: 100,
    ambientSoundEnabled: true,
    ambientSoundVolume: 0.3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      ambientSound: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      tourPreferences: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmbientSoundsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AmbientSoundsService>(AmbientSoundsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSounds', () => {
    it('should return all sounds when no filters applied', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSounds({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sound-1');
      expect(result[0].category).toBe(AmbientSoundCategory.BEACH);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {},
        take: 20,
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by category', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSounds({ category: AmbientSoundCategory.BEACH });

      expect(result).toHaveLength(1);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: { category: AmbientSoundCategory.BEACH },
        take: 20,
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by tags', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSounds({ tags: ['waves', 'ocean'] });

      expect(result).toHaveLength(1);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: { tags: { hasSome: ['waves', 'ocean'] } },
        take: 20,
        orderBy: { name: 'asc' },
      });
    });

    it('should respect limit parameter', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      await service.getSounds({ limit: 5 });

      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should combine category and tags filters', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      await service.getSounds({
        category: AmbientSoundCategory.BEACH,
        tags: ['waves'],
      });

      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {
          category: AmbientSoundCategory.BEACH,
          tags: { hasSome: ['waves'] },
        },
        take: 20,
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getSoundsByCategory', () => {
    it('should return sounds for a specific category', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSoundsByCategory(AmbientSoundCategory.BEACH);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(AmbientSoundCategory.BEACH);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: { category: AmbientSoundCategory.BEACH },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no sounds found', async () => {
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSoundsByCategory(AmbientSoundCategory.MUSEUM);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSoundById', () => {
    it('should return a sound by ID', async () => {
      (prisma.ambientSound.findUnique as jest.Mock).mockResolvedValue(mockSound);

      const result = await service.getSoundById('sound-1');

      expect(result.id).toBe('sound-1');
      expect(result.name).toBe('Ocean Waves');
      expect(prisma.ambientSound.findUnique).toHaveBeenCalledWith({
        where: { id: 'sound-1' },
      });
    });

    it('should throw NotFoundException when sound not found', async () => {
      (prisma.ambientSound.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getSoundById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSoundsForPoiType', () => {
    it('should return sounds for PARK POI type', async () => {
      const natureSounds = [
        { ...mockSound, category: AmbientSoundCategory.NATURE, name: 'Birds' },
        { ...mockSound, category: AmbientSoundCategory.PARK, name: 'Park Ambience' },
      ];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(natureSounds);

      const result = await service.getSoundsForPoiType(PoiType.PARK);

      expect(result).toHaveLength(2);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {
          category: {
            in: [AmbientSoundCategory.NATURE, AmbientSoundCategory.PARK],
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return sounds for SHOP POI type', async () => {
      const sounds = [{ ...mockSound, category: AmbientSoundCategory.MARKET }];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSoundsForPoiType(PoiType.SHOP);

      expect(result).toHaveLength(1);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {
          category: {
            in: [AmbientSoundCategory.MARKET, AmbientSoundCategory.CITY],
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return sounds for MUSEUM POI type', async () => {
      const sounds = [{ ...mockSound, category: AmbientSoundCategory.MUSEUM }];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSoundsForPoiType(PoiType.MUSEUM);

      expect(result).toHaveLength(1);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {
          category: {
            in: [AmbientSoundCategory.MUSEUM],
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return sounds for RESTAURANT POI type', async () => {
      const sounds = [{ ...mockSound, category: AmbientSoundCategory.CAFE }];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getSoundsForPoiType(PoiType.RESTAURANT);

      expect(result).toHaveLength(1);
      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {
          category: {
            in: [AmbientSoundCategory.CAFE, AmbientSoundCategory.MARKET],
          },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getRandomSoundForLocation', () => {
    it('should return a random sound for given POI type', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      const result = await service.getRandomSoundForLocation(47.5, 19.0, PoiType.PARK);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('sound-1');
    });

    it('should return null when no sounds available', async () => {
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRandomSoundForLocation(47.5, 19.0, PoiType.PARK);

      expect(result).toBeNull();
    });

    it('should use all categories when no POI type provided', async () => {
      const sounds = [mockSound];
      (prisma.ambientSound.findMany as jest.Mock).mockResolvedValue(sounds);

      await service.getRandomSoundForLocation(47.5, 19.0);

      expect(prisma.ambientSound.findMany).toHaveBeenCalledWith({
        where: {
          category: {
            in: Object.values(AmbientSoundCategory),
          },
        },
      });
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      (prisma.tourPreferences.findUnique as jest.Mock).mockResolvedValue({
        ambientSoundEnabled: true,
        ambientSoundVolume: 0.5,
      });

      const result = await service.getPreferences('user-1');

      expect(result.enabled).toBe(true);
      expect(result.volume).toBe(0.5);
    });

    it('should create default preferences if none exist', async () => {
      (prisma.tourPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.tourPreferences.create as jest.Mock).mockResolvedValue({
        ambientSoundEnabled: true,
        ambientSoundVolume: 0.3,
      });

      const result = await service.getPreferences('user-1');

      expect(result.enabled).toBe(true);
      expect(result.volume).toBe(0.3);
      expect(prisma.tourPreferences.create).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('should update enabled setting', async () => {
      (prisma.tourPreferences.findUnique as jest.Mock).mockResolvedValue(mockTourPreferences);
      (prisma.tourPreferences.update as jest.Mock).mockResolvedValue({
        ambientSoundEnabled: false,
        ambientSoundVolume: 0.3,
      });

      const result = await service.updatePreferences('user-1', { enabled: false });

      expect(result.enabled).toBe(false);
      expect(prisma.tourPreferences.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { ambientSoundEnabled: false },
        select: {
          ambientSoundEnabled: true,
          ambientSoundVolume: true,
        },
      });
    });

    it('should update volume setting', async () => {
      (prisma.tourPreferences.findUnique as jest.Mock).mockResolvedValue(mockTourPreferences);
      (prisma.tourPreferences.update as jest.Mock).mockResolvedValue({
        ambientSoundEnabled: true,
        ambientSoundVolume: 0.8,
      });

      const result = await service.updatePreferences('user-1', { volume: 0.8 });

      expect(result.volume).toBe(0.8);
      expect(prisma.tourPreferences.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { ambientSoundVolume: 0.8 },
        select: {
          ambientSoundEnabled: true,
          ambientSoundVolume: true,
        },
      });
    });

    it('should update both enabled and volume', async () => {
      (prisma.tourPreferences.findUnique as jest.Mock).mockResolvedValue(mockTourPreferences);
      (prisma.tourPreferences.update as jest.Mock).mockResolvedValue({
        ambientSoundEnabled: false,
        ambientSoundVolume: 0.1,
      });

      const result = await service.updatePreferences('user-1', {
        enabled: false,
        volume: 0.1,
      });

      expect(result.enabled).toBe(false);
      expect(result.volume).toBe(0.1);
    });

    it('should create preferences if none exist', async () => {
      (prisma.tourPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.tourPreferences.create as jest.Mock).mockResolvedValue({
        ambientSoundEnabled: false,
        ambientSoundVolume: 0.5,
      });

      const result = await service.updatePreferences('user-1', {
        enabled: false,
        volume: 0.5,
      });

      expect(result.enabled).toBe(false);
      expect(result.volume).toBe(0.5);
      expect(prisma.tourPreferences.create).toHaveBeenCalled();
    });
  });

  describe('getAvailableCategories', () => {
    it('should return all ambient sound categories', () => {
      const categories = service.getAvailableCategories();

      expect(categories).toContain(AmbientSoundCategory.BEACH);
      expect(categories).toContain(AmbientSoundCategory.CITY);
      expect(categories).toContain(AmbientSoundCategory.NATURE);
      expect(categories).toContain(AmbientSoundCategory.PARK);
      expect(categories).toContain(AmbientSoundCategory.MARKET);
      expect(categories).toContain(AmbientSoundCategory.CAFE);
      expect(categories).toContain(AmbientSoundCategory.MUSEUM);
      expect(categories).toContain(AmbientSoundCategory.TRANSPORT);
      expect(categories).toContain(AmbientSoundCategory.RAIN);
      expect(categories).toContain(AmbientSoundCategory.NIGHT);
    });
  });

  describe('getPoiToSoundMapping', () => {
    it('should return POI to sound category mapping', () => {
      const mapping = service.getPoiToSoundMapping();

      expect(mapping[PoiType.PARK]).toContain(AmbientSoundCategory.NATURE);
      expect(mapping[PoiType.SHOP]).toContain(AmbientSoundCategory.MARKET);
      expect(mapping[PoiType.MUSEUM]).toContain(AmbientSoundCategory.MUSEUM);
      expect(mapping[PoiType.RESTAURANT]).toContain(AmbientSoundCategory.CAFE);
    });

    it('should have mapping for all POI types', () => {
      const mapping = service.getPoiToSoundMapping();
      const poiTypes = Object.values(PoiType);

      poiTypes.forEach((poiType) => {
        expect(mapping[poiType]).toBeDefined();
        expect(mapping[poiType].length).toBeGreaterThan(0);
      });
    });
  });
});
