import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PoiService } from './poi.service';
import { PoiType } from '@prisma/client';

describe('PoiService', () => {
  let service: PoiService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PoiService>(PoiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNearbyPois', () => {
    it('should return mock POIs when no API key is configured', async () => {
      mockConfigService.get.mockReturnValue('');

      const result = await service.getNearbyPois({
        latitude: 47.4979,
        longitude: 19.0402,
        radius: 500,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('placeId');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('type');
    });

    it('should filter mock POIs by type', async () => {
      mockConfigService.get.mockReturnValue('');

      const result = await service.getNearbyPois({
        latitude: 47.4979,
        longitude: 19.0402,
        radius: 500,
        types: [PoiType.RESTAURANT],
      });

      expect(result.every((poi) => poi.type === PoiType.RESTAURANT)).toBe(true);
    });

    it('should respect the limit parameter', async () => {
      mockConfigService.get.mockReturnValue('');

      const result = await service.getNearbyPois({
        latitude: 47.4979,
        longitude: 19.0402,
        radius: 500,
        limit: 2,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should include distance in results', async () => {
      mockConfigService.get.mockReturnValue('');

      const result = await service.getNearbyPois({
        latitude: 47.4979,
        longitude: 19.0402,
        radius: 500,
      });

      expect(result[0]).toHaveProperty('distance');
      expect(typeof result[0].distance).toBe('number');
    });
  });

  describe('getPoiDetails', () => {
    it('should return mock POI details when no API key is configured', async () => {
      mockConfigService.get.mockReturnValue('');

      const result = await service.getPoiDetails({
        placeId: 'mock_place_id',
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('placeId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
    });

    it('should include opening hours in details', async () => {
      mockConfigService.get.mockReturnValue('');

      const result = await service.getPoiDetails({
        placeId: 'mock_place_id',
      });

      expect(result).toHaveProperty('openingHours');
      expect(Array.isArray(result.openingHours)).toBe(true);
    });
  });

  describe('mapGoogleTypesToPoiType', () => {
    it('should map restaurant type correctly', () => {
      const result = service.mapGoogleTypesToPoiType(['restaurant', 'food']);
      expect(result).toBe(PoiType.RESTAURANT);
    });

    it('should map park type correctly', () => {
      const result = service.mapGoogleTypesToPoiType(['park', 'natural_feature']);
      expect(result).toBe(PoiType.PARK);
    });

    it('should map museum type correctly', () => {
      const result = service.mapGoogleTypesToPoiType(['museum', 'art_gallery']);
      expect(result).toBe(PoiType.MUSEUM);
    });

    it('should map landmark type correctly', () => {
      const result = service.mapGoogleTypesToPoiType(['tourist_attraction']);
      expect(result).toBe(PoiType.LANDMARK);
    });

    it('should return OTHER for unknown types', () => {
      const result = service.mapGoogleTypesToPoiType(['unknown_type']);
      expect(result).toBe(PoiType.OTHER);
    });

    it('should prioritize first matching type', () => {
      const result = service.mapGoogleTypesToPoiType(['cafe', 'establishment']);
      expect(result).toBe(PoiType.RESTAURANT);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance between two points in Budapest
      const distance = service.calculateDistance(47.4979, 19.0402, 47.5079, 19.0502);

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same point', () => {
      const distance = service.calculateDistance(47.4979, 19.0402, 47.4979, 19.0402);
      expect(distance).toBe(0);
    });

    it('should calculate roughly correct distance', () => {
      // Approximately 1km distance
      const distance = service.calculateDistance(47.4979, 19.0402, 47.5069, 19.0402);

      // Should be roughly 1000 meters (with some tolerance)
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });
  });
});
