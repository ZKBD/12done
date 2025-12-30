import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { VoiceStyle, InterestCategory } from '@prisma/client';
import { UpdatePreferencesDto, PreferencesResponseDto } from './dto';

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
}
