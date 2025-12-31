import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OfflineModeService } from './offline-mode.service';
import { PrismaService } from '@/database/prisma.service';
import { PoiService } from './poi.service';
import { NarrationService } from './narration.service';
import { VoiceStyle, PoiType } from '@prisma/client';

describe('OfflineModeService', () => {
  let service: OfflineModeService;
  let prisma: jest.Mocked<PrismaService>;
  let poiService: jest.Mocked<PoiService>;
  let narrationService: jest.Mocked<NarrationService>;

  const mockRegion = {
    id: 'region-1',
    userId: 'user-1',
    name: 'Budapest Downtown',
    centerLat: 47.497913,
    centerLng: 19.040236,
    radiusKm: 5,
    poiCount: 10,
    sizeBytes: 5000,
    lastSyncedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPoi = {
    placeId: 'place-1',
    name: 'Test POI',
    type: PoiType.LANDMARK,
    latitude: 47.5,
    longitude: 19.0,
    address: '123 Test St',
  };

  const mockCachedPoi = {
    id: 'cache-1',
    regionId: 'region-1',
    placeId: 'place-1',
    data: mockPoi,
    narrations: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      offlineRegion: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      offlinePoiCache: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const mockPoiService = {
      getNearbyPois: jest.fn(),
    };

    const mockNarrationService = {
      generateNarration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineModeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PoiService, useValue: mockPoiService },
        { provide: NarrationService, useValue: mockNarrationService },
      ],
    }).compile();

    service = module.get<OfflineModeService>(OfflineModeService);
    prisma = module.get(PrismaService);
    poiService = module.get(PoiService);
    narrationService = module.get(NarrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRegion', () => {
    it('should create a new offline region', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.offlineRegion.create as jest.Mock).mockResolvedValue(mockRegion);

      const result = await service.createRegion('user-1', {
        name: 'Budapest Downtown',
        centerLat: 47.497913,
        centerLng: 19.040236,
        radiusKm: 5,
      });

      expect(result.name).toBe('Budapest Downtown');
      expect(result.radiusKm).toBe(5);
      expect(prisma.offlineRegion.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if region name exists', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);

      await expect(
        service.createRegion('user-1', {
          name: 'Budapest Downtown',
          centerLat: 47.497913,
          centerLng: 19.040236,
          radiusKm: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getRegions', () => {
    it('should return all regions for a user', async () => {
      const regions = [mockRegion, { ...mockRegion, id: 'region-2', name: 'Other Region' }];
      (prisma.offlineRegion.findMany as jest.Mock).mockResolvedValue(regions);

      const result = await service.getRegions('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Budapest Downtown');
    });

    it('should return empty array if no regions exist', async () => {
      (prisma.offlineRegion.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRegions('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getRegion', () => {
    it('should return a specific region', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);

      const result = await service.getRegion('user-1', 'region-1');

      expect(result.id).toBe('region-1');
      expect(result.name).toBe('Budapest Downtown');
    });

    it('should throw NotFoundException if region not found', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getRegion('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own region', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue({
        ...mockRegion,
        userId: 'other-user',
      });

      await expect(service.getRegion('user-1', 'region-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadRegionData', () => {
    it('should download and cache POI data', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (poiService.getNearbyPois as jest.Mock).mockResolvedValue([mockPoi]);
      (prisma.offlinePoiCache.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.offlinePoiCache.create as jest.Mock).mockResolvedValue(mockCachedPoi);
      (prisma.offlineRegion.update as jest.Mock).mockResolvedValue({
        ...mockRegion,
        poiCount: 1,
        lastSyncedAt: new Date(),
      });

      const result = await service.downloadRegionData('user-1', 'region-1');

      expect(result.poiCount).toBe(1);
      expect(poiService.getNearbyPois).toHaveBeenCalledWith({
        latitude: mockRegion.centerLat,
        longitude: mockRegion.centerLng,
        radius: mockRegion.radiusKm * 1000,
        limit: 100,
      });
    });

    it('should clear existing cached POIs before downloading', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (poiService.getNearbyPois as jest.Mock).mockResolvedValue([]);
      (prisma.offlinePoiCache.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.offlineRegion.update as jest.Mock).mockResolvedValue(mockRegion);

      await service.downloadRegionData('user-1', 'region-1');

      expect(prisma.offlinePoiCache.deleteMany).toHaveBeenCalledWith({
        where: { regionId: 'region-1' },
      });
    });
  });

  describe('preGenerateNarrations', () => {
    it('should generate narrations for all cached POIs', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (prisma.offlinePoiCache.findMany as jest.Mock).mockResolvedValue([mockCachedPoi]);
      (narrationService.generateNarration as jest.Mock).mockResolvedValue({
        placeId: 'place-1',
        placeName: 'Test POI',
        narration: 'Test narration text',
        voiceStyle: VoiceStyle.FRIENDLY,
        language: 'en',
        estimatedDuration: 30,
      });
      (prisma.offlinePoiCache.update as jest.Mock).mockResolvedValue(mockCachedPoi);
      (prisma.offlineRegion.update as jest.Mock).mockResolvedValue(mockRegion);

      await service.preGenerateNarrations('user-1', 'region-1');

      expect(narrationService.generateNarration).toHaveBeenCalledTimes(3); // 3 voice styles
      expect(prisma.offlinePoiCache.update).toHaveBeenCalled();
    });

    it('should handle narration generation failures gracefully', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (prisma.offlinePoiCache.findMany as jest.Mock).mockResolvedValue([mockCachedPoi]);
      (narrationService.generateNarration as jest.Mock).mockRejectedValue(
        new Error('API error'),
      );
      (prisma.offlinePoiCache.update as jest.Mock).mockResolvedValue(mockCachedPoi);
      (prisma.offlineRegion.update as jest.Mock).mockResolvedValue(mockRegion);

      // Should not throw
      await expect(service.preGenerateNarrations('user-1', 'region-1')).resolves.toBeDefined();
    });
  });

  describe('getRegionPois', () => {
    it('should return cached POI data', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (prisma.offlinePoiCache.findMany as jest.Mock).mockResolvedValue([mockCachedPoi]);

      const result = await service.getRegionPois('user-1', 'region-1');

      expect(result).toHaveLength(1);
      expect(result[0].placeId).toBe('place-1');
    });

    it('should return empty array if no cached POIs', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (prisma.offlinePoiCache.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRegionPois('user-1', 'region-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('syncRegion', () => {
    it('should re-download data and extend expiry', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (poiService.getNearbyPois as jest.Mock).mockResolvedValue([mockPoi]);
      (prisma.offlinePoiCache.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.offlinePoiCache.create as jest.Mock).mockResolvedValue(mockCachedPoi);
      (prisma.offlineRegion.update as jest.Mock).mockResolvedValue(mockRegion);

      const result = await service.syncRegion('user-1', 'region-1');

      expect(result).toBeDefined();
      expect(prisma.offlineRegion.update).toHaveBeenCalled();
    });
  });

  describe('deleteRegion', () => {
    it('should delete region and cached POIs', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(mockRegion);
      (prisma.offlinePoiCache.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.offlineRegion.delete as jest.Mock).mockResolvedValue(mockRegion);

      await service.deleteRegion('user-1', 'region-1');

      expect(prisma.offlinePoiCache.deleteMany).toHaveBeenCalledWith({
        where: { regionId: 'region-1' },
      });
      expect(prisma.offlineRegion.delete).toHaveBeenCalledWith({
        where: { id: 'region-1' },
      });
    });

    it('should throw NotFoundException if region not found', async () => {
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRegion('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStorageUsage', () => {
    it('should calculate total storage usage', async () => {
      const regions = [
        { sizeBytes: 1000, poiCount: 5 },
        { sizeBytes: 2000, poiCount: 10 },
      ];
      (prisma.offlineRegion.findMany as jest.Mock).mockResolvedValue(regions);

      const result = await service.getStorageUsage('user-1');

      expect(result.totalBytes).toBe(3000);
      expect(result.regionCount).toBe(2);
      expect(result.totalPois).toBe(15);
    });

    it('should return zeros if no regions exist', async () => {
      (prisma.offlineRegion.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStorageUsage('user-1');

      expect(result.totalBytes).toBe(0);
      expect(result.regionCount).toBe(0);
      expect(result.totalPois).toBe(0);
    });
  });

  describe('isRegionExpired', () => {
    it('should return false if region has not expired', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue({
        ...mockRegion,
        expiresAt: futureDate,
      });

      const result = await service.isRegionExpired('user-1', 'region-1');

      expect(result).toBe(false);
    });

    it('should return true if region has expired', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      (prisma.offlineRegion.findUnique as jest.Mock).mockResolvedValue({
        ...mockRegion,
        expiresAt: pastDate,
      });

      const result = await service.isRegionExpired('user-1', 'region-1');

      expect(result).toBe(true);
    });
  });
});
