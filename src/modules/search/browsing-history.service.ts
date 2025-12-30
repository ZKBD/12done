import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyStatus, ListingType } from '@prisma/client';
import { PrismaService } from '@/database';
import { BrowsingHistoryResponseDto } from './dto/browsing-history.dto';

@Injectable()
export class BrowsingHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Track a property view for a user
   * @param userId - The user viewing the property
   * @param propertyId - The property being viewed
   * @param duration - Optional time spent viewing in seconds
   */
  async trackView(
    userId: string,
    propertyId: string,
    duration?: number,
  ): Promise<BrowsingHistoryResponseDto> {
    // Verify property exists and is active
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    // Create browsing history entry
    const history = await this.prisma.browsingHistory.create({
      data: {
        userId,
        propertyId,
        duration,
      },
      include: {
        property: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    return this.mapToResponseDto(history);
  }

  /**
   * Update duration for an existing view (e.g., when user leaves page)
   */
  async updateViewDuration(
    historyId: string,
    userId: string,
    duration: number,
  ): Promise<BrowsingHistoryResponseDto> {
    const history = await this.prisma.browsingHistory.findFirst({
      where: { id: historyId, userId },
    });

    if (!history) {
      throw new NotFoundException('History entry not found');
    }

    const updated = await this.prisma.browsingHistory.update({
      where: { id: historyId },
      data: { duration },
      include: {
        property: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Get user's browsing history with optional limit
   */
  async getHistory(
    userId: string,
    limit: number = 50,
  ): Promise<BrowsingHistoryResponseDto[]> {
    const history = await this.prisma.browsingHistory.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: limit,
    });

    return history
      .filter((h) => h.property.status !== PropertyStatus.DELETED)
      .map((h) => this.mapToResponseDto(h));
  }

  /**
   * Get user's recent views within a specified number of days
   */
  async getRecentViews(
    userId: string,
    days: number = 30,
  ): Promise<BrowsingHistoryResponseDto[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const history = await this.prisma.browsingHistory.findMany({
      where: {
        userId,
        viewedAt: { gte: cutoffDate },
      },
      include: {
        property: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
    });

    return history
      .filter((h) => h.property.status !== PropertyStatus.DELETED)
      .map((h) => this.mapToResponseDto(h));
  }

  /**
   * Get unique property IDs from recent history (for recommendation engine)
   */
  async getRecentPropertyIds(userId: string, days: number = 30): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const history = await this.prisma.browsingHistory.findMany({
      where: {
        userId,
        viewedAt: { gte: cutoffDate },
        property: {
          status: { not: PropertyStatus.DELETED },
        },
      },
      select: { propertyId: true },
      distinct: ['propertyId'],
      orderBy: { viewedAt: 'desc' },
    });

    return history.map((h) => h.propertyId);
  }

  /**
   * Get properties with aggregated view data (for preference extraction)
   */
  async getViewedPropertiesWithStats(
    userId: string,
    days: number = 30,
  ): Promise<
    Array<{
      propertyId: string;
      viewCount: number;
      totalDuration: number;
      lastViewedAt: Date;
      property: {
        id: string;
        city: string;
        country: string;
        listingTypes: ListingType[];
        basePrice: string;
        currency: string;
        squareMeters: number | null;
        bedrooms: number | null;
        bathrooms: number | null;
        petFriendly: boolean;
        newlyBuilt: boolean;
        accessible: boolean;
      };
    }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get grouped stats
    const stats = await this.prisma.browsingHistory.groupBy({
      by: ['propertyId'],
      where: {
        userId,
        viewedAt: { gte: cutoffDate },
      },
      _count: { id: true },
      _sum: { duration: true },
      _max: { viewedAt: true },
    });

    if (stats.length === 0) {
      return [];
    }

    // Get property details
    const properties = await this.prisma.property.findMany({
      where: {
        id: { in: stats.map((s) => s.propertyId) },
        status: { not: PropertyStatus.DELETED },
      },
      select: {
        id: true,
        city: true,
        country: true,
        listingTypes: true,
        basePrice: true,
        currency: true,
        squareMeters: true,
        bedrooms: true,
        bathrooms: true,
        petFriendly: true,
        newlyBuilt: true,
        accessible: true,
      },
    });

    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    return stats
      .filter((s) => propertyMap.has(s.propertyId))
      .map((s) => ({
        propertyId: s.propertyId,
        viewCount: s._count.id,
        totalDuration: s._sum.duration || 0,
        lastViewedAt: s._max.viewedAt!,
        property: {
          ...propertyMap.get(s.propertyId)!,
          basePrice: propertyMap.get(s.propertyId)!.basePrice.toString(),
        },
      }))
      .sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime());
  }

  /**
   * Clear user's browsing history (privacy feature)
   */
  async clearHistory(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.browsingHistory.deleteMany({
      where: { userId },
    });

    return { count: result.count };
  }

  /**
   * Delete specific history entry
   */
  async deleteEntry(
    historyId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const history = await this.prisma.browsingHistory.findFirst({
      where: { id: historyId, userId },
    });

    if (!history) {
      throw new NotFoundException('History entry not found');
    }

    await this.prisma.browsingHistory.delete({
      where: { id: historyId },
    });

    return { message: 'History entry deleted' };
  }

  private mapToResponseDto(history: {
    id: string;
    userId: string;
    propertyId: string;
    viewedAt: Date;
    duration: number | null;
    property: {
      id: string;
      title: string;
      city: string;
      country: string;
      listingTypes: ListingType[];
      basePrice: { toString(): string };
      currency: string;
      squareMeters: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      status: PropertyStatus;
      media: Array<{ url: string }>;
    };
  }): BrowsingHistoryResponseDto {
    return {
      id: history.id,
      propertyId: history.propertyId,
      userId: history.userId,
      viewedAt: history.viewedAt,
      duration: history.duration || undefined,
      property: {
        id: history.property.id,
        title: history.property.title,
        city: history.property.city,
        country: history.property.country,
        listingTypes: history.property.listingTypes,
        basePrice: history.property.basePrice.toString(),
        currency: history.property.currency,
        squareMeters: history.property.squareMeters || undefined,
        bedrooms: history.property.bedrooms || undefined,
        bathrooms: history.property.bathrooms || undefined,
        status: history.property.status,
        primaryImageUrl: history.property.media[0]?.url,
      },
    };
  }
}
