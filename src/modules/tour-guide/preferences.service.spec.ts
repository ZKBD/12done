import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesService } from './preferences.service';
import { PrismaService } from '@/database/prisma.service';
import { VoiceStyle, InterestCategory, PoiType } from '@prisma/client';

describe('PreferencesService', () => {
  let service: PreferencesService;

  const mockPrismaService = {
    tourPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    interestHistory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockPreferences = {
    id: 'pref-123',
    userId: 'user-123',
    voiceStyle: VoiceStyle.FRIENDLY,
    language: 'en',
    interests: [InterestCategory.HISTORY],
    followMeEnabled: true,
    poiRadius: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences('user-123');

      expect(result).toBeDefined();
      expect(result.voiceStyle).toBe(VoiceStyle.FRIENDLY);
      expect(result.language).toBe('en');
    });

    it('should create default preferences if none exist', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(null);
      mockPrismaService.tourPreferences.create.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences('user-123');

      expect(mockPrismaService.tourPreferences.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(mockPreferences);
      mockPrismaService.tourPreferences.update.mockResolvedValue({
        ...mockPreferences,
        voiceStyle: VoiceStyle.HISTORICAL,
      });

      const result = await service.updatePreferences('user-123', {
        voiceStyle: VoiceStyle.HISTORICAL,
      });

      expect(result.voiceStyle).toBe(VoiceStyle.HISTORICAL);
    });

    it('should create preferences if updating non-existent', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(null);
      mockPrismaService.tourPreferences.create.mockResolvedValue({
        ...mockPreferences,
        voiceStyle: VoiceStyle.PROFESSIONAL,
      });

      const result = await service.updatePreferences('user-123', {
        voiceStyle: VoiceStyle.PROFESSIONAL,
      });

      expect(mockPrismaService.tourPreferences.create).toHaveBeenCalled();
      expect(result.voiceStyle).toBe(VoiceStyle.PROFESSIONAL);
    });

    it('should update multiple fields at once', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(mockPreferences);
      mockPrismaService.tourPreferences.update.mockResolvedValue({
        ...mockPreferences,
        voiceStyle: VoiceStyle.HISTORICAL,
        language: 'de',
        poiRadius: 200,
      });

      const result = await service.updatePreferences('user-123', {
        voiceStyle: VoiceStyle.HISTORICAL,
        language: 'de',
        poiRadius: 200,
      });

      expect(result.voiceStyle).toBe(VoiceStyle.HISTORICAL);
      expect(result.language).toBe('de');
      expect(result.poiRadius).toBe(200);
    });
  });

  describe('getVoiceStyle', () => {
    it('should return voice style', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getVoiceStyle('user-123');

      expect(result).toBe(VoiceStyle.FRIENDLY);
    });
  });

  describe('getLanguage', () => {
    it('should return language', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getLanguage('user-123');

      expect(result).toBe('en');
    });
  });

  describe('getInterests', () => {
    it('should return interests array', async () => {
      mockPrismaService.tourPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getInterests('user-123');

      expect(result).toEqual([InterestCategory.HISTORY]);
    });
  });

  // ============================================
  // Interest History Tests (PROD-133)
  // ============================================

  describe('recordInterestUsage', () => {
    const mockInterestHistory = {
      id: 'history-1',
      userId: 'user-123',
      interest: InterestCategory.HISTORY,
      queryCount: 1,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    };

    it('should create new interest history entry', async () => {
      mockPrismaService.interestHistory.findUnique.mockResolvedValue(null);
      mockPrismaService.interestHistory.create.mockResolvedValue(mockInterestHistory);

      const result = await service.recordInterestUsage('user-123', InterestCategory.HISTORY);

      expect(result.interest).toBe(InterestCategory.HISTORY);
      expect(result.queryCount).toBe(1);
      expect(mockPrismaService.interestHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          interest: InterestCategory.HISTORY,
          queryCount: 1,
        }),
      });
    });

    it('should increment existing interest history entry', async () => {
      const existingHistory = { ...mockInterestHistory, queryCount: 5 };
      const updatedHistory = { ...mockInterestHistory, queryCount: 6 };

      mockPrismaService.interestHistory.findUnique.mockResolvedValue(existingHistory);
      mockPrismaService.interestHistory.update.mockResolvedValue(updatedHistory);

      const result = await service.recordInterestUsage('user-123', InterestCategory.HISTORY);

      expect(result.queryCount).toBe(6);
      expect(mockPrismaService.interestHistory.update).toHaveBeenCalledWith({
        where: {
          userId_interest: {
            userId: 'user-123',
            interest: InterestCategory.HISTORY,
          },
        },
        data: expect.objectContaining({
          queryCount: { increment: 1 },
        }),
      });
    });
  });

  describe('getInterestHistory', () => {
    it('should return user interest history ordered by query count', async () => {
      const mockHistories = [
        { interest: InterestCategory.HISTORY, queryCount: 10, lastUsedAt: new Date() },
        { interest: InterestCategory.ART, queryCount: 5, lastUsedAt: new Date() },
        { interest: InterestCategory.FOOD, queryCount: 3, lastUsedAt: new Date() },
      ];
      mockPrismaService.interestHistory.findMany.mockResolvedValue(mockHistories);

      const result = await service.getInterestHistory('user-123');

      expect(result).toHaveLength(3);
      expect(result[0].interest).toBe(InterestCategory.HISTORY);
      expect(result[0].queryCount).toBe(10);
      expect(mockPrismaService.interestHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ queryCount: 'desc' }, { lastUsedAt: 'desc' }],
      });
    });

    it('should return empty array if no history exists', async () => {
      mockPrismaService.interestHistory.findMany.mockResolvedValue([]);

      const result = await service.getInterestHistory('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getSuggestedInterests', () => {
    it('should suggest interests based on POI type', async () => {
      mockPrismaService.interestHistory.findMany.mockResolvedValue([]);

      const result = await service.getSuggestedInterests('user-123', PoiType.MUSEUM);

      expect(result.suggestions).toContain(InterestCategory.HISTORY);
      expect(result.suggestions).toContain(InterestCategory.ART);
      expect(result.suggestions).toContain(InterestCategory.CULTURE);
      expect(result.basedOnPoiType).toBe(PoiType.MUSEUM);
    });

    it('should include user history in suggestions', async () => {
      const mockHistories = [
        { interest: InterestCategory.ARCHITECTURE, queryCount: 10, lastUsedAt: new Date() },
      ];
      mockPrismaService.interestHistory.findMany.mockResolvedValue(mockHistories);

      const result = await service.getSuggestedInterests('user-123', PoiType.PARK);

      expect(result.suggestions).toContain(InterestCategory.NATURE);
      expect(result.suggestions).toContain(InterestCategory.ARCHITECTURE);
    });

    it('should return default interests when no POI type provided', async () => {
      mockPrismaService.interestHistory.findMany.mockResolvedValue([]);

      const result = await service.getSuggestedInterests('user-123', undefined, 5);

      expect(result.suggestions.length).toBeLessThanOrEqual(5);
      expect(result.suggestions).toContain(InterestCategory.HISTORY);
      expect(result.basedOnPoiType).toBeUndefined();
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.interestHistory.findMany.mockResolvedValue([]);

      const result = await service.getSuggestedInterests('user-123', PoiType.MUSEUM, 2);

      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should suggest interests for RESTAURANT POI type', async () => {
      mockPrismaService.interestHistory.findMany.mockResolvedValue([]);

      const result = await service.getSuggestedInterests('user-123', PoiType.RESTAURANT);

      expect(result.suggestions).toContain(InterestCategory.FOOD);
      expect(result.suggestions).toContain(InterestCategory.CULTURE);
    });

    it('should suggest interests for PARK POI type', async () => {
      mockPrismaService.interestHistory.findMany.mockResolvedValue([]);

      const result = await service.getSuggestedInterests('user-123', PoiType.PARK);

      expect(result.suggestions).toContain(InterestCategory.NATURE);
      expect(result.suggestions).toContain(InterestCategory.SPORTS);
    });
  });

  describe('clearInterestHistory', () => {
    it('should delete all interest history for user', async () => {
      mockPrismaService.interestHistory.deleteMany.mockResolvedValue({ count: 5 });

      await service.clearInterestHistory('user-123');

      expect(mockPrismaService.interestHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
