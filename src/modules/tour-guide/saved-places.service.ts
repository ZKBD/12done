import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PoiType, Prisma } from '@prisma/client';
import {
  SavePlaceDto,
  UpdateSavedPlaceDto,
  SavedPlaceResponseDto,
} from './dto';

@Injectable()
export class SavedPlacesService {
  private readonly logger = new Logger(SavedPlacesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save a place to user's bookmarks (PROD-130.2)
   */
  async savePlace(userId: string, dto: SavePlaceDto): Promise<SavedPlaceResponseDto> {
    // Check if already saved
    const existing = await this.prisma.savedPlace.findUnique({
      where: {
        userId_placeId: {
          userId,
          placeId: dto.placeId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Place already saved');
    }

    const savedPlace = await this.prisma.savedPlace.create({
      data: {
        userId,
        placeId: dto.placeId,
        placeName: dto.placeName,
        placeType: dto.placeType ?? PoiType.OTHER,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        notes: dto.notes,
      },
    });

    this.logger.log(`User ${userId} saved place ${dto.placeId}`);
    return this.mapToResponse(savedPlace);
  }

  /**
   * Get all saved places for a user (PROD-130.3)
   */
  async getSavedPlaces(
    userId: string,
    options?: {
      type?: PoiType;
      limit?: number;
      offset?: number;
    },
  ): Promise<SavedPlaceResponseDto[]> {
    const where: Prisma.SavedPlaceWhereInput = { userId };

    if (options?.type) {
      where.placeType = options.type;
    }

    const savedPlaces = await this.prisma.savedPlace.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return savedPlaces.map((sp) => this.mapToResponse(sp));
  }

  /**
   * Get a specific saved place
   */
  async getSavedPlace(userId: string, id: string): Promise<SavedPlaceResponseDto> {
    const savedPlace = await this.prisma.savedPlace.findFirst({
      where: { id, userId },
    });

    if (!savedPlace) {
      throw new NotFoundException('Saved place not found');
    }

    return this.mapToResponse(savedPlace);
  }

  /**
   * Check if a place is saved
   */
  async isPlaceSaved(userId: string, placeId: string): Promise<boolean> {
    const count = await this.prisma.savedPlace.count({
      where: {
        userId,
        placeId,
      },
    });
    return count > 0;
  }

  /**
   * Update saved place notes
   */
  async updateSavedPlace(
    userId: string,
    id: string,
    dto: UpdateSavedPlaceDto,
  ): Promise<SavedPlaceResponseDto> {
    const existing = await this.prisma.savedPlace.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved place not found');
    }

    const updated = await this.prisma.savedPlace.update({
      where: { id },
      data: {
        notes: dto.notes,
      },
    });

    this.logger.log(`User ${userId} updated saved place ${id}`);
    return this.mapToResponse(updated);
  }

  /**
   * Remove a saved place (PROD-130.4)
   */
  async removeSavedPlace(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.savedPlace.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved place not found');
    }

    await this.prisma.savedPlace.delete({
      where: { id },
    });

    this.logger.log(`User ${userId} removed saved place ${id}`);
  }

  /**
   * Remove saved place by placeId
   */
  async removeSavedPlaceByPlaceId(userId: string, placeId: string): Promise<void> {
    const existing = await this.prisma.savedPlace.findUnique({
      where: {
        userId_placeId: {
          userId,
          placeId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved place not found');
    }

    await this.prisma.savedPlace.delete({
      where: { id: existing.id },
    });

    this.logger.log(`User ${userId} removed saved place ${placeId}`);
  }

  /**
   * Get count of saved places
   */
  async getSavedPlacesCount(userId: string): Promise<number> {
    return this.prisma.savedPlace.count({
      where: { userId },
    });
  }

  private mapToResponse(savedPlace: {
    id: string;
    placeId: string;
    placeName: string;
    placeType: PoiType;
    latitude: number;
    longitude: number;
    address: string | null;
    notes: string | null;
    createdAt: Date;
  }): SavedPlaceResponseDto {
    return {
      id: savedPlace.id,
      placeId: savedPlace.placeId,
      placeName: savedPlace.placeName,
      placeType: savedPlace.placeType,
      latitude: savedPlace.latitude,
      longitude: savedPlace.longitude,
      address: savedPlace.address ?? undefined,
      notes: savedPlace.notes ?? undefined,
      createdAt: savedPlace.createdAt,
    };
  }
}
