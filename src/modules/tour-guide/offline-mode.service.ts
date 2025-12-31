import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, VoiceStyle } from '@prisma/client';
import {
  CreateOfflineRegionDto,
  OfflineRegionResponseDto,
  OfflineStorageResponseDto,
  OfflinePoiDataResponseDto,
} from './dto';
import { PoiService } from './poi.service';
import { NarrationService } from './narration.service';

// Default data expiry in days
const DEFAULT_EXPIRY_DAYS = 30;

@Injectable()
export class OfflineModeService {
  private readonly logger = new Logger(OfflineModeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly poiService: PoiService,
    private readonly narrationService: NarrationService,
  ) {}

  /**
   * Create a new offline region for data download (PROD-129)
   */
  async createRegion(
    userId: string,
    dto: CreateOfflineRegionDto,
  ): Promise<OfflineRegionResponseDto> {
    // Check if region with same name already exists for user
    const existing = await this.prisma.offlineRegion.findUnique({
      where: {
        userId_name: {
          userId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Region with name "${dto.name}" already exists`);
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

    const region = await this.prisma.offlineRegion.create({
      data: {
        userId,
        name: dto.name,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusKm: dto.radiusKm,
        expiresAt,
        poiCount: 0,
        sizeBytes: 0,
      },
    });

    this.logger.log(`Created offline region "${dto.name}" for user ${userId}`);

    return this.mapRegionToResponse(region);
  }

  /**
   * Get all offline regions for a user (PROD-129)
   */
  async getRegions(userId: string): Promise<OfflineRegionResponseDto[]> {
    const regions = await this.prisma.offlineRegion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return regions.map(this.mapRegionToResponse);
  }

  /**
   * Get a specific offline region by ID (PROD-129)
   */
  async getRegion(userId: string, regionId: string): Promise<OfflineRegionResponseDto> {
    const region = await this.prisma.offlineRegion.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      throw new NotFoundException(`Region with ID ${regionId} not found`);
    }

    if (region.userId !== userId) {
      throw new ForbiddenException('You do not have access to this region');
    }

    return this.mapRegionToResponse(region);
  }

  /**
   * Download and cache POI data for a region (PROD-129)
   */
  async downloadRegionData(
    userId: string,
    regionId: string,
  ): Promise<OfflineRegionResponseDto> {
    const region = await this.getRegionEntity(userId, regionId);

    // Fetch POIs from the POI service
    const pois = await this.poiService.getNearbyPois({
      latitude: region.centerLat,
      longitude: region.centerLng,
      radius: region.radiusKm * 1000, // Convert km to meters
      limit: 100, // Maximum POIs to cache
    });

    // Delete existing cached POIs for this region
    await this.prisma.offlinePoiCache.deleteMany({
      where: { regionId },
    });

    // Cache each POI
    let totalSize = 0;
    for (const poi of pois) {
      const poiData = JSON.stringify(poi);
      totalSize += poiData.length;

      await this.prisma.offlinePoiCache.create({
        data: {
          regionId,
          placeId: poi.placeId,
          data: poi as unknown as Prisma.InputJsonValue,
          narrations: Prisma.JsonNull,
        },
      });
    }

    // Update region with sync info
    const updatedRegion = await this.prisma.offlineRegion.update({
      where: { id: regionId },
      data: {
        poiCount: pois.length,
        sizeBytes: totalSize,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(`Downloaded ${pois.length} POIs for region ${regionId}`);

    return this.mapRegionToResponse(updatedRegion);
  }

  /**
   * Pre-generate narrations for all POIs in a region (PROD-129)
   */
  async preGenerateNarrations(
    userId: string,
    regionId: string,
  ): Promise<OfflineRegionResponseDto> {
    const region = await this.getRegionEntity(userId, regionId);

    const cachedPois = await this.prisma.offlinePoiCache.findMany({
      where: { regionId },
    });

    const voiceStyles = [VoiceStyle.FRIENDLY, VoiceStyle.HISTORICAL, VoiceStyle.PROFESSIONAL];
    let additionalSize = 0;

    for (const cachedPoi of cachedPois) {
      const narrations: Record<string, string> = {};

      for (const style of voiceStyles) {
        try {
          const narration = await this.narrationService.generateNarration({
            placeId: cachedPoi.placeId,
            voiceStyle: style,
            language: 'en',
          });
          narrations[style] = narration.narration;
          additionalSize += narration.narration.length;
        } catch {
          this.logger.warn(`Failed to generate ${style} narration for ${cachedPoi.placeId}`);
        }
      }

      await this.prisma.offlinePoiCache.update({
        where: { id: cachedPoi.id },
        data: { narrations },
      });
    }

    // Update region size
    const updatedRegion = await this.prisma.offlineRegion.update({
      where: { id: regionId },
      data: {
        sizeBytes: region.sizeBytes + additionalSize,
      },
    });

    this.logger.log(`Pre-generated narrations for ${cachedPois.length} POIs in region ${regionId}`);

    return this.mapRegionToResponse(updatedRegion);
  }

  /**
   * Get cached POI data for a region (PROD-129)
   */
  async getRegionPois(
    userId: string,
    regionId: string,
  ): Promise<OfflinePoiDataResponseDto[]> {
    await this.getRegionEntity(userId, regionId); // Verify access

    const cachedPois = await this.prisma.offlinePoiCache.findMany({
      where: { regionId },
      orderBy: { createdAt: 'asc' },
    });

    return cachedPois.map((poi) => ({
      placeId: poi.placeId,
      data: poi.data as Record<string, unknown>,
      narrations: poi.narrations as Record<string, string> | undefined,
      createdAt: poi.createdAt,
    }));
  }

  /**
   * Sync/refresh data for an expired region (PROD-129)
   */
  async syncRegion(
    userId: string,
    regionId: string,
  ): Promise<OfflineRegionResponseDto> {
    // Re-download data and extend expiry
    await this.downloadRegionData(userId, regionId);

    // Update expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

    const updatedRegion = await this.prisma.offlineRegion.update({
      where: { id: regionId },
      data: { expiresAt },
    });

    this.logger.log(`Synced region ${regionId}`);

    return this.mapRegionToResponse(updatedRegion);
  }

  /**
   * Delete an offline region and its cached data (PROD-129)
   */
  async deleteRegion(userId: string, regionId: string): Promise<void> {
    await this.getRegionEntity(userId, regionId); // Verify access

    // Delete cached POIs first (cascade should handle this, but being explicit)
    await this.prisma.offlinePoiCache.deleteMany({
      where: { regionId },
    });

    // Delete the region
    await this.prisma.offlineRegion.delete({
      where: { id: regionId },
    });

    this.logger.log(`Deleted region ${regionId}`);
  }

  /**
   * Get storage usage summary for a user (PROD-129)
   */
  async getStorageUsage(userId: string): Promise<OfflineStorageResponseDto> {
    const regions = await this.prisma.offlineRegion.findMany({
      where: { userId },
      select: {
        sizeBytes: true,
        poiCount: true,
      },
    });

    const totalBytes = regions.reduce((sum, r) => sum + r.sizeBytes, 0);
    const totalPois = regions.reduce((sum, r) => sum + r.poiCount, 0);

    return {
      totalBytes,
      regionCount: regions.length,
      totalPois,
    };
  }

  /**
   * Check if a region's data has expired (PROD-129)
   */
  async isRegionExpired(userId: string, regionId: string): Promise<boolean> {
    const region = await this.getRegionEntity(userId, regionId);
    return region.expiresAt < new Date();
  }

  /**
   * Get region entity with access validation
   */
  private async getRegionEntity(userId: string, regionId: string) {
    const region = await this.prisma.offlineRegion.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      throw new NotFoundException(`Region with ID ${regionId} not found`);
    }

    if (region.userId !== userId) {
      throw new ForbiddenException('You do not have access to this region');
    }

    return region;
  }

  private mapRegionToResponse(region: {
    id: string;
    name: string;
    centerLat: number;
    centerLng: number;
    radiusKm: number;
    poiCount: number;
    sizeBytes: number;
    lastSyncedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }): OfflineRegionResponseDto {
    return {
      id: region.id,
      name: region.name,
      centerLat: region.centerLat,
      centerLng: region.centerLng,
      radiusKm: region.radiusKm,
      poiCount: region.poiCount,
      sizeBytes: region.sizeBytes,
      lastSyncedAt: region.lastSyncedAt ?? undefined,
      expiresAt: region.expiresAt,
      createdAt: region.createdAt,
    };
  }
}
