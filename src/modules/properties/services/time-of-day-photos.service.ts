import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { TimeOfDay, Season, UserRole } from '@prisma/client';
import {
  UpdateMediaTimeTagDto,
  TimeTaggedMediaResponseDto,
  PhotoGroupResponseDto,
} from '../dto/virtual-staging.dto';

@Injectable()
export class TimeOfDayPhotosService {
  private readonly logger = new Logger(TimeOfDayPhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tag media with time of day and season (PROD-031.1, PROD-031.2)
   */
  async tagMedia(
    propertyId: string,
    mediaId: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateMediaTimeTagDto,
  ): Promise<TimeTaggedMediaResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can tag media');
    }

    const media = await this.prisma.propertyMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found');
    }

    // Update the media with time/season tags
    const updated = await this.prisma.propertyMedia.update({
      where: { id: mediaId },
      data: {
        timeOfDay: dto.timeOfDay,
        season: dto.season,
        photoGroupId: dto.photoGroupId,
      },
    });

    this.logger.log(
      `Tagged media ${mediaId} with timeOfDay=${dto.timeOfDay}, season=${dto.season}, group=${dto.photoGroupId}`,
    );

    return this.mapToResponse(updated);
  }

  /**
   * Create a photo group to link photos of same angle (PROD-031.4)
   */
  async createPhotoGroup(
    propertyId: string,
    userId: string,
    userRole: UserRole,
    name: string,
  ): Promise<{ groupId: string; name: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can create photo groups');
    }

    // Generate a group ID (combination of property ID and name for uniqueness)
    const groupId = `${propertyId}-${name.toLowerCase().replace(/\s+/g, '-')}`;

    this.logger.log(`Created photo group ${groupId} for property ${propertyId}`);

    return { groupId, name };
  }

  /**
   * Add media to a photo group
   */
  async addToGroup(
    propertyId: string,
    mediaId: string,
    groupId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<TimeTaggedMediaResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can modify photo groups');
    }

    const media = await this.prisma.propertyMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found');
    }

    const updated = await this.prisma.propertyMedia.update({
      where: { id: mediaId },
      data: { photoGroupId: groupId },
    });

    this.logger.log(`Added media ${mediaId} to group ${groupId}`);

    return this.mapToResponse(updated);
  }

  /**
   * Remove media from a photo group
   */
  async removeFromGroup(
    propertyId: string,
    mediaId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<TimeTaggedMediaResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can modify photo groups');
    }

    const media = await this.prisma.propertyMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found');
    }

    const updated = await this.prisma.propertyMedia.update({
      where: { id: mediaId },
      data: { photoGroupId: null },
    });

    this.logger.log(`Removed media ${mediaId} from its group`);

    return this.mapToResponse(updated);
  }

  /**
   * Get all photo groups for a property (PROD-031.4)
   */
  async getPhotoGroups(propertyId: string): Promise<PhotoGroupResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Get all media with photo group IDs
    const mediaWithGroups = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        photoGroupId: { not: null },
      },
      orderBy: [{ photoGroupId: 'asc' }, { timeOfDay: 'asc' }],
    });

    // Group by photoGroupId
    const groups: Map<string, PhotoGroupResponseDto> = new Map();

    for (const media of mediaWithGroups) {
      if (!media.photoGroupId) continue;

      if (!groups.has(media.photoGroupId)) {
        groups.set(media.photoGroupId, {
          groupId: media.photoGroupId,
          photos: [],
          timesOfDay: [],
          seasons: [],
        });
      }

      const group = groups.get(media.photoGroupId)!;
      group.photos.push(this.mapToResponse(media));

      if (media.timeOfDay && !group.timesOfDay.includes(media.timeOfDay)) {
        group.timesOfDay.push(media.timeOfDay);
      }

      if (media.season && !group.seasons.includes(media.season)) {
        group.seasons.push(media.season);
      }
    }

    return Array.from(groups.values());
  }

  /**
   * Get a specific photo group
   */
  async getPhotoGroup(
    propertyId: string,
    groupId: string,
  ): Promise<PhotoGroupResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const media = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        photoGroupId: groupId,
      },
      orderBy: [{ timeOfDay: 'asc' }, { season: 'asc' }],
    });

    if (media.length === 0) {
      throw new NotFoundException('Photo group not found or empty');
    }

    const timesOfDay: TimeOfDay[] = [];
    const seasons: Season[] = [];

    for (const m of media) {
      if (m.timeOfDay && !timesOfDay.includes(m.timeOfDay)) {
        timesOfDay.push(m.timeOfDay);
      }
      if (m.season && !seasons.includes(m.season)) {
        seasons.push(m.season);
      }
    }

    return {
      groupId,
      photos: media.map((m) => this.mapToResponse(m)),
      timesOfDay,
      seasons,
    };
  }

  /**
   * Get all time-tagged media for a property
   */
  async getTimeTaggedMedia(propertyId: string): Promise<TimeTaggedMediaResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const media = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        OR: [
          { timeOfDay: { not: null } },
          { season: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return media.map((m) => this.mapToResponse(m));
  }

  /**
   * Filter media by time of day
   */
  async getMediaByTimeOfDay(
    propertyId: string,
    timeOfDay: TimeOfDay,
  ): Promise<TimeTaggedMediaResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const media = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        timeOfDay,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return media.map((m) => this.mapToResponse(m));
  }

  /**
   * Filter media by season
   */
  async getMediaBySeason(
    propertyId: string,
    season: Season,
  ): Promise<TimeTaggedMediaResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const media = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        season,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return media.map((m) => this.mapToResponse(m));
  }

  /**
   * Get slider data for a photo group (PROD-031.3)
   * Returns photos organized for time/season slider UI
   */
  async getSliderData(
    propertyId: string,
    groupId: string,
  ): Promise<{
    groupId: string;
    timeSlider: Record<TimeOfDay, TimeTaggedMediaResponseDto | null>;
    seasonSlider: Record<Season, TimeTaggedMediaResponseDto | null>;
  }> {
    const group = await this.getPhotoGroup(propertyId, groupId);

    // Initialize sliders with all possible values as null
    const timeSlider: Record<TimeOfDay, TimeTaggedMediaResponseDto | null> = {
      [TimeOfDay.DAWN]: null,
      [TimeOfDay.MORNING]: null,
      [TimeOfDay.NOON]: null,
      [TimeOfDay.AFTERNOON]: null,
      [TimeOfDay.DUSK]: null,
      [TimeOfDay.NIGHT]: null,
    };

    const seasonSlider: Record<Season, TimeTaggedMediaResponseDto | null> = {
      [Season.SPRING]: null,
      [Season.SUMMER]: null,
      [Season.FALL]: null,
      [Season.WINTER]: null,
    };

    // Fill in available photos
    for (const photo of group.photos) {
      if (photo.timeOfDay) {
        timeSlider[photo.timeOfDay] = photo;
      }
      if (photo.season) {
        seasonSlider[photo.season] = photo;
      }
    }

    return {
      groupId,
      timeSlider,
      seasonSlider,
    };
  }

  /**
   * Bulk tag multiple media items
   */
  async bulkTagMedia(
    propertyId: string,
    userId: string,
    userRole: UserRole,
    items: Array<{ mediaId: string; timeOfDay?: TimeOfDay; season?: Season; photoGroupId?: string }>,
  ): Promise<TimeTaggedMediaResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can tag media');
    }

    const results: TimeTaggedMediaResponseDto[] = [];

    for (const item of items) {
      const media = await this.prisma.propertyMedia.findUnique({
        where: { id: item.mediaId },
      });

      if (!media || media.propertyId !== propertyId) {
        continue; // Skip invalid media
      }

      const updated = await this.prisma.propertyMedia.update({
        where: { id: item.mediaId },
        data: {
          timeOfDay: item.timeOfDay,
          season: item.season,
          photoGroupId: item.photoGroupId,
        },
      });

      results.push(this.mapToResponse(updated));
    }

    this.logger.log(`Bulk tagged ${results.length} media items for property ${propertyId}`);

    return results;
  }

  private mapToResponse(media: any): TimeTaggedMediaResponseDto {
    return {
      id: media.id,
      propertyId: media.propertyId,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      timeOfDay: media.timeOfDay,
      season: media.season,
      photoGroupId: media.photoGroupId,
      caption: media.caption,
      createdAt: media.createdAt,
    };
  }
}
