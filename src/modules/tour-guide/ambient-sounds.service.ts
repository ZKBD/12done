import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AmbientSoundCategory, PoiType } from '@prisma/client';
import {
  AmbientSoundResponseDto,
  AmbientSoundQueryDto,
  UpdateAmbientSoundPreferencesDto,
  AmbientSoundPreferencesResponseDto,
} from './dto';

/**
 * POI Type to Ambient Sound Category mapping
 * Each POI type maps to one or more suitable ambient sound categories
 */
const POI_TO_SOUND_MAPPING: Record<PoiType, AmbientSoundCategory[]> = {
  [PoiType.RESTAURANT]: [AmbientSoundCategory.CAFE, AmbientSoundCategory.MARKET],
  [PoiType.BUILDING]: [AmbientSoundCategory.CITY],
  [PoiType.PARK]: [AmbientSoundCategory.NATURE, AmbientSoundCategory.PARK],
  [PoiType.SHOP]: [AmbientSoundCategory.MARKET, AmbientSoundCategory.CITY],
  [PoiType.LANDMARK]: [AmbientSoundCategory.CITY],
  [PoiType.MUSEUM]: [AmbientSoundCategory.MUSEUM],
  [PoiType.HOTEL]: [AmbientSoundCategory.CAFE],
  [PoiType.TRANSPORT]: [AmbientSoundCategory.TRANSPORT, AmbientSoundCategory.CITY],
  [PoiType.ENTERTAINMENT]: [AmbientSoundCategory.CITY],
  [PoiType.HEALTHCARE]: [AmbientSoundCategory.CITY],
  [PoiType.EDUCATION]: [AmbientSoundCategory.CITY],
  [PoiType.OTHER]: [AmbientSoundCategory.CITY],
};

@Injectable()
export class AmbientSoundsService {
  private readonly logger = new Logger(AmbientSoundsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all ambient sounds, optionally filtered (PROD-128)
   */
  async getSounds(query: AmbientSoundQueryDto): Promise<AmbientSoundResponseDto[]> {
    const { category, tags, limit = 20 } = query;

    const whereClause: Record<string, unknown> = {};

    if (category) {
      whereClause.category = category;
    }

    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasSome: tags,
      };
    }

    const sounds = await this.prisma.ambientSound.findMany({
      where: whereClause,
      take: limit,
      orderBy: { name: 'asc' },
    });

    return sounds.map(this.mapToResponse);
  }

  /**
   * Get sounds by category (PROD-128)
   */
  async getSoundsByCategory(category: AmbientSoundCategory): Promise<AmbientSoundResponseDto[]> {
    const sounds = await this.prisma.ambientSound.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });

    return sounds.map(this.mapToResponse);
  }

  /**
   * Get a specific sound by ID (PROD-128)
   */
  async getSoundById(id: string): Promise<AmbientSoundResponseDto> {
    const sound = await this.prisma.ambientSound.findUnique({
      where: { id },
    });

    if (!sound) {
      throw new NotFoundException(`Ambient sound with ID ${id} not found`);
    }

    return this.mapToResponse(sound);
  }

  /**
   * Get recommended sounds for a POI type (PROD-128)
   */
  async getSoundsForPoiType(poiType: PoiType): Promise<AmbientSoundResponseDto[]> {
    const categories = POI_TO_SOUND_MAPPING[poiType] || [AmbientSoundCategory.CITY];

    const sounds = await this.prisma.ambientSound.findMany({
      where: {
        category: {
          in: categories,
        },
      },
      orderBy: { name: 'asc' },
    });

    return sounds.map(this.mapToResponse);
  }

  /**
   * Get a random sound for a location based on POI type (PROD-128)
   */
  async getRandomSoundForLocation(
    _latitude: number,
    _longitude: number,
    poiType?: PoiType,
  ): Promise<AmbientSoundResponseDto | null> {
    const categories = poiType
      ? POI_TO_SOUND_MAPPING[poiType] || [AmbientSoundCategory.CITY]
      : Object.values(AmbientSoundCategory);

    const sounds = await this.prisma.ambientSound.findMany({
      where: {
        category: {
          in: categories,
        },
      },
    });

    if (sounds.length === 0) {
      return null;
    }

    // Pick a random sound
    const randomIndex = Math.floor(Math.random() * sounds.length);
    return this.mapToResponse(sounds[randomIndex]);
  }

  /**
   * Get user's ambient sound preferences (PROD-128)
   */
  async getPreferences(userId: string): Promise<AmbientSoundPreferencesResponseDto> {
    let prefs = await this.prisma.tourPreferences.findUnique({
      where: { userId },
      select: {
        ambientSoundEnabled: true,
        ambientSoundVolume: true,
      },
    });

    if (!prefs) {
      // Create default preferences
      prefs = await this.prisma.tourPreferences.create({
        data: {
          userId,
          voiceStyle: 'FRIENDLY',
          language: 'en',
          interests: [],
          followMeEnabled: true,
          poiRadius: 100,
          ambientSoundEnabled: true,
          ambientSoundVolume: 0.3,
        },
        select: {
          ambientSoundEnabled: true,
          ambientSoundVolume: true,
        },
      });
    }

    return {
      enabled: prefs.ambientSoundEnabled,
      volume: prefs.ambientSoundVolume,
    };
  }

  /**
   * Update user's ambient sound preferences (PROD-128)
   */
  async updatePreferences(
    userId: string,
    dto: UpdateAmbientSoundPreferencesDto,
  ): Promise<AmbientSoundPreferencesResponseDto> {
    const updateData: Record<string, unknown> = {};

    if (dto.enabled !== undefined) {
      updateData.ambientSoundEnabled = dto.enabled;
    }
    if (dto.volume !== undefined) {
      updateData.ambientSoundVolume = dto.volume;
    }

    // Check if preferences exist
    const existing = await this.prisma.tourPreferences.findUnique({
      where: { userId },
    });

    let prefs;
    if (existing) {
      prefs = await this.prisma.tourPreferences.update({
        where: { userId },
        data: updateData,
        select: {
          ambientSoundEnabled: true,
          ambientSoundVolume: true,
        },
      });
    } else {
      prefs = await this.prisma.tourPreferences.create({
        data: {
          userId,
          voiceStyle: 'FRIENDLY',
          language: 'en',
          interests: [],
          followMeEnabled: true,
          poiRadius: 100,
          ambientSoundEnabled: dto.enabled ?? true,
          ambientSoundVolume: dto.volume ?? 0.3,
        },
        select: {
          ambientSoundEnabled: true,
          ambientSoundVolume: true,
        },
      });
    }

    this.logger.log(`Updated ambient sound preferences for user ${userId}`);

    return {
      enabled: prefs.ambientSoundEnabled,
      volume: prefs.ambientSoundVolume,
    };
  }

  /**
   * Get all available sound categories (PROD-128)
   */
  getAvailableCategories(): AmbientSoundCategory[] {
    return Object.values(AmbientSoundCategory);
  }

  /**
   * Get the POI to sound mapping (PROD-128)
   */
  getPoiToSoundMapping(): Record<PoiType, AmbientSoundCategory[]> {
    return POI_TO_SOUND_MAPPING;
  }

  private mapToResponse(sound: {
    id: string;
    category: AmbientSoundCategory;
    name: string;
    description: string | null;
    audioUrl: string;
    duration: number;
    loopable: boolean;
    tags: string[];
  }): AmbientSoundResponseDto {
    return {
      id: sound.id,
      category: sound.category,
      name: sound.name,
      description: sound.description ?? undefined,
      audioUrl: sound.audioUrl,
      duration: sound.duration,
      loopable: sound.loopable,
      tags: sound.tags,
    };
  }
}
