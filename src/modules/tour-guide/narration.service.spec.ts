import { Test, TestingModule } from '@nestjs/testing';
import { NarrationService } from './narration.service';
import { PoiService } from './poi.service';
import { VoiceStyle, InterestCategory, PoiType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('NarrationService', () => {
  let service: NarrationService;

  const mockPoiService = {
    getPoiDetails: jest.fn(),
    getNearbyPois: jest.fn(),
    calculateDistance: jest.fn(),
    mapGoogleTypesToPoiType: jest.fn(),
  };

  const mockPoi = {
    placeId: 'test_place_id',
    name: 'Test Museum',
    type: PoiType.MUSEUM,
    latitude: 47.4979,
    longitude: 19.0402,
    address: '123 Test Street',
    rating: 4.5,
    reviewCount: 1000,
    isOpen: true,
    openingHours: ['Monday: 9:00 AM – 6:00 PM'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NarrationService,
        {
          provide: PoiService,
          useValue: mockPoiService,
        },
      ],
    }).compile();

    service = module.get<NarrationService>(NarrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateNarration', () => {
    it('should generate narration for a POI', async () => {
      mockPoiService.getPoiDetails.mockResolvedValue(mockPoi);

      const result = await service.generateNarration({
        placeId: 'test_place_id',
        voiceStyle: VoiceStyle.FRIENDLY,
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(result.placeId).toBe('test_place_id');
      expect(result.placeName).toBe('Test Museum');
      expect(result.narration).toBeDefined();
      expect(result.narration.length).toBeGreaterThan(0);
      expect(result.voiceStyle).toBe(VoiceStyle.FRIENDLY);
    });

    it('should throw NotFoundException for non-existent POI', async () => {
      mockPoiService.getPoiDetails.mockResolvedValue(null);

      await expect(
        service.generateNarration({
          placeId: 'non_existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate estimated speaking duration', async () => {
      mockPoiService.getPoiDetails.mockResolvedValue(mockPoi);

      const result = await service.generateNarration({
        placeId: 'test_place_id',
      });

      expect(result.estimatedDuration).toBeDefined();
      expect(result.estimatedDuration).toBeGreaterThan(0);
    });

    it('should include interests in response', async () => {
      mockPoiService.getPoiDetails.mockResolvedValue(mockPoi);

      const result = await service.generateNarration({
        placeId: 'test_place_id',
        interests: [InterestCategory.HISTORY, InterestCategory.ART],
      });

      expect(result.interests).toEqual([InterestCategory.HISTORY, InterestCategory.ART]);
    });
  });

  describe('buildNarration', () => {
    it('should use FRIENDLY voice style template', () => {
      const narration = service.buildNarration(mockPoi, VoiceStyle.FRIENDLY);

      expect(narration).toContain('Hey');
      expect(narration).toContain(mockPoi.name);
    });

    it('should use HISTORICAL voice style template', () => {
      const narration = service.buildNarration(mockPoi, VoiceStyle.HISTORICAL);

      expect(narration).toContain('arrive at');
      expect(narration).toContain(mockPoi.name);
    });

    it('should use PROFESSIONAL voice style template', () => {
      const narration = service.buildNarration(mockPoi, VoiceStyle.PROFESSIONAL);

      expect(narration).toContain('Welcome to');
      expect(narration).toContain(mockPoi.name);
    });

    it('should include rating information', () => {
      const narration = service.buildNarration(mockPoi, VoiceStyle.FRIENDLY);

      expect(narration).toContain('4.5');
    });

    it('should include open/closed status', () => {
      const narration = service.buildNarration(mockPoi, VoiceStyle.FRIENDLY);

      expect(narration.toLowerCase()).toContain('open');
    });

    it('should handle closed status', () => {
      const closedPoi = { ...mockPoi, isOpen: false };
      const narration = service.buildNarration(closedPoi, VoiceStyle.FRIENDLY);

      expect(narration.toLowerCase()).toContain('closed');
    });

    it('should include interest-specific content', () => {
      const narration = service.buildNarration(mockPoi, VoiceStyle.FRIENDLY, [
        InterestCategory.HISTORY,
      ]);

      expect(narration.length).toBeGreaterThan(0);
    });
  });

  describe('generateNavigationNarration', () => {
    it('should generate navigation instruction in FRIENDLY style', () => {
      const narration = service.generateNavigationNarration(
        'Turn left',
        200,
        VoiceStyle.FRIENDLY,
      );

      expect(narration.toLowerCase()).toContain('turn left');
      expect(narration).toContain('200 meters');
    });

    it('should convert to kilometers for long distances', () => {
      const narration = service.generateNavigationNarration(
        'Continue straight',
        1500,
        VoiceStyle.FRIENDLY,
      );

      expect(narration).toContain('1.5 kilometers');
    });

    it('should use HISTORICAL style template', () => {
      const narration = service.generateNavigationNarration(
        'Turn right',
        100,
        VoiceStyle.HISTORICAL,
      );

      expect(narration).toContain('Proceed');
    });

    it('should use PROFESSIONAL style template', () => {
      const narration = service.generateNavigationNarration(
        'Turn right',
        100,
        VoiceStyle.PROFESSIONAL,
      );

      expect(narration).toContain('Distance:');
    });
  });

  describe('generateArrivalNarration', () => {
    it('should generate arrival narration in FRIENDLY style', () => {
      const narration = service.generateArrivalNarration('Test Museum', VoiceStyle.FRIENDLY);

      expect(narration).toContain("We're here");
      expect(narration).toContain('Test Museum');
    });

    it('should generate arrival narration in HISTORICAL style', () => {
      const narration = service.generateArrivalNarration('Test Museum', VoiceStyle.HISTORICAL);

      expect(narration).toContain('arrived at');
      expect(narration).toContain('Test Museum');
    });

    it('should generate arrival narration in PROFESSIONAL style', () => {
      const narration = service.generateArrivalNarration(
        'Test Museum',
        VoiceStyle.PROFESSIONAL,
      );

      expect(narration).toContain('Destination reached');
      expect(narration).toContain('Test Museum');
    });
  });
});
