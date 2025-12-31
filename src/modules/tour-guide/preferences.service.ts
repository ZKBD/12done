import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { VoiceStyle, InterestCategory, PoiType } from '@prisma/client';
import {
  UpdatePreferencesDto,
  PreferencesResponseDto,
  InterestHistoryResponseDto,
  SuggestedInterestsResponseDto,
} from './dto';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's tour preferences (PROD-127, PROD-133)
   */
  async getPreferences(userId: string): Promise<PreferencesResponseDto> {
    let prefs = await this.prisma.tourPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if none exist
    if (!prefs) {
      prefs = await this.prisma.tourPreferences.create({
        data: {
          userId,
          voiceStyle: VoiceStyle.FRIENDLY,
          language: 'en',
          interests: [],
          followMeEnabled: true,
          poiRadius: 100,
        },
      });
    }

    return this.mapToResponse(prefs);
  }

  /**
   * Update user's tour preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    const existing = await this.prisma.tourPreferences.findUnique({
      where: { userId },
    });

    const updateData: Record<string, unknown> = {};

    if (dto.voiceStyle !== undefined) updateData.voiceStyle = dto.voiceStyle;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.interests !== undefined) updateData.interests = dto.interests;
    if (dto.followMeEnabled !== undefined) updateData.followMeEnabled = dto.followMeEnabled;
    if (dto.poiRadius !== undefined) updateData.poiRadius = dto.poiRadius;

    let prefs;
    if (existing) {
      prefs = await this.prisma.tourPreferences.update({
        where: { userId },
        data: updateData,
      });
    } else {
      prefs = await this.prisma.tourPreferences.create({
        data: {
          userId,
          voiceStyle: dto.voiceStyle ?? VoiceStyle.FRIENDLY,
          language: dto.language ?? 'en',
          interests: dto.interests ?? [],
          followMeEnabled: dto.followMeEnabled ?? true,
          poiRadius: dto.poiRadius ?? 100,
        },
      });
    }

    this.logger.log(`Updated preferences for user ${userId}`);
    return this.mapToResponse(prefs);
  }

  /**
   * Get specific preference value
   */
  async getVoiceStyle(userId: string): Promise<VoiceStyle> {
    const prefs = await this.getPreferences(userId);
    return prefs.voiceStyle;
  }

  async getLanguage(userId: string): Promise<string> {
    const prefs = await this.getPreferences(userId);
    return prefs.language;
  }

  async getInterests(userId: string): Promise<InterestCategory[]> {
    const prefs = await this.getPreferences(userId);
    return prefs.interests;
  }

  private mapToResponse(prefs: {
    id: string;
    voiceStyle: VoiceStyle;
    language: string;
    interests: unknown;
    followMeEnabled: boolean;
    poiRadius: number;
  }): PreferencesResponseDto {
    return {
      id: prefs.id,
      voiceStyle: prefs.voiceStyle,
      language: prefs.language,
      interests: (prefs.interests as InterestCategory[]) || [],
      followMeEnabled: prefs.followMeEnabled,
      poiRadius: prefs.poiRadius,
    };
  }

  // ============================================
  // Interest History Methods (PROD-133)
  // ============================================

  /**
   * Record interest usage for smart suggestions (PROD-133)
   */
  async recordInterestUsage(
    userId: string,
    interest: InterestCategory,
  ): Promise<InterestHistoryResponseDto> {
    const existing = await this.prisma.interestHistory.findUnique({
      where: {
        userId_interest: {
          userId,
          interest,
        },
      },
    });

    let history;
    if (existing) {
      history = await this.prisma.interestHistory.update({
        where: {
          userId_interest: {
            userId,
            interest,
          },
        },
        data: {
          queryCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    } else {
      history = await this.prisma.interestHistory.create({
        data: {
          userId,
          interest,
          queryCount: 1,
          lastUsedAt: new Date(),
        },
      });
    }

    this.logger.debug(`Recorded usage of interest ${interest} for user ${userId}`);

    return {
      interest: history.interest,
      queryCount: history.queryCount,
      lastUsedAt: history.lastUsedAt,
    };
  }

  /**
   * Get interest usage history (PROD-133)
   */
  async getInterestHistory(userId: string): Promise<InterestHistoryResponseDto[]> {
    const history = await this.prisma.interestHistory.findMany({
      where: { userId },
      orderBy: [{ queryCount: 'desc' }, { lastUsedAt: 'desc' }],
    });

    return history.map((h) => ({
      interest: h.interest,
      queryCount: h.queryCount,
      lastUsedAt: h.lastUsedAt,
    }));
  }

  /**
   * Get suggested interests based on POI type and user history (PROD-133)
   */
  async getSuggestedInterests(
    userId: string,
    poiType?: PoiType,
    limit: number = 5,
  ): Promise<SuggestedInterestsResponseDto> {
    // Get user's most used interests
    const userHistory = await this.prisma.interestHistory.findMany({
      where: { userId },
      orderBy: [{ queryCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
    });

    // POI type to relevant interests mapping
    const poiInterestMapping: Record<PoiType, InterestCategory[]> = {
      [PoiType.MUSEUM]: [
        InterestCategory.HISTORY,
        InterestCategory.ART,
        InterestCategory.CULTURE,
      ],
      [PoiType.RESTAURANT]: [
        InterestCategory.FOOD,
        InterestCategory.CULTURE,
      ],
      [PoiType.PARK]: [
        InterestCategory.NATURE,
        InterestCategory.SPORTS,
        InterestCategory.FAMILY,
      ],
      [PoiType.LANDMARK]: [
        InterestCategory.HISTORY,
        InterestCategory.ARCHITECTURE,
        InterestCategory.CULTURE,
      ],
      [PoiType.HOTEL]: [
        InterestCategory.FOOD,
        InterestCategory.CULTURE,
      ],
      [PoiType.SHOP]: [
        InterestCategory.SHOPPING,
        InterestCategory.CULTURE,
      ],
      [PoiType.ENTERTAINMENT]: [
        InterestCategory.NIGHTLIFE,
        InterestCategory.CULTURE,
        InterestCategory.ART,
      ],
      [PoiType.TRANSPORT]: [
        InterestCategory.HISTORY,
        InterestCategory.ARCHITECTURE,
      ],
      [PoiType.BUILDING]: [
        InterestCategory.ARCHITECTURE,
        InterestCategory.HISTORY,
      ],
      [PoiType.HEALTHCARE]: [
        InterestCategory.FAMILY,
        InterestCategory.CULTURE,
      ],
      [PoiType.EDUCATION]: [
        InterestCategory.HISTORY,
        InterestCategory.CULTURE,
      ],
      [PoiType.OTHER]: [
        InterestCategory.CULTURE,
        InterestCategory.HISTORY,
      ],
    };

    let suggestions: InterestCategory[] = [];

    // If POI type is provided, get relevant interests for that POI
    if (poiType && poiInterestMapping[poiType]) {
      suggestions = [...poiInterestMapping[poiType]];
    }

    // Add user's frequently used interests that aren't already suggested
    const userInterests = userHistory.map((h) => h.interest);
    for (const interest of userInterests) {
      if (!suggestions.includes(interest)) {
        suggestions.push(interest);
      }
    }

    // If still not enough suggestions, add some default popular interests
    const defaultInterests: InterestCategory[] = [
      InterestCategory.HISTORY,
      InterestCategory.CULTURE,
      InterestCategory.FOOD,
      InterestCategory.NATURE,
      InterestCategory.ART,
    ];

    for (const interest of defaultInterests) {
      if (!suggestions.includes(interest) && suggestions.length < limit) {
        suggestions.push(interest);
      }
    }

    // Limit to requested number
    suggestions = suggestions.slice(0, limit);

    return {
      suggestions,
      basedOnPoiType: poiType,
    };
  }

  /**
   * Clear interest history for a user (PROD-133)
   */
  async clearInterestHistory(userId: string): Promise<void> {
    await this.prisma.interestHistory.deleteMany({
      where: { userId },
    });

    this.logger.log(`Cleared interest history for user ${userId}`);
  }
}
