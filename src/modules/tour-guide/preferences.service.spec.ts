import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesService } from './preferences.service';
import { PrismaService } from '@/database/prisma.service';
import { VoiceStyle, InterestCategory } from '@prisma/client';

describe('PreferencesService', () => {
  let service: PreferencesService;

  const mockPrismaService = {
    tourPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
});
