import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PropertyStatus, ListingType } from '@prisma/client';
import { PrismaService } from '@/database';
import { FavoritePropertyResponseDto, FavoriteStatsDto } from './dto';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(
    propertyId: string,
    userId: string,
  ): Promise<FavoritePropertyResponseDto> {
    // Check if property exists and is active
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    // Check if already favorited
    const existing = await this.prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Property already in favorites');
    }

    const favorite = await this.prisma.favoriteProperty.create({
      data: {
        userId,
        propertyId,
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

    return this.mapToResponseDto(favorite);
  }

  async removeFavorite(
    propertyId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const favorite = await this.prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favoriteProperty.delete({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    return { message: 'Property removed from favorites' };
  }

  async getFavorites(userId: string): Promise<FavoritePropertyResponseDto[]> {
    const favorites = await this.prisma.favoriteProperty.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return favorites
      .filter((f) => f.property.status !== PropertyStatus.DELETED)
      .map((f) => this.mapToResponseDto(f));
  }

  async isFavorite(propertyId: string, userId: string): Promise<boolean> {
    const favorite = await this.prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    return !!favorite;
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favoriteProperty.findMany({
      where: { userId },
      select: { propertyId: true },
    });

    return favorites.map((f) => f.propertyId);
  }

  async getStats(userId: string): Promise<FavoriteStatsDto> {
    const favorites = await this.prisma.favoriteProperty.findMany({
      where: { userId },
      include: {
        property: {
          select: { listingTypes: true },
        },
      },
    });

    const byListingType: Record<string, number> = {};

    for (const fav of favorites) {
      for (const type of fav.property.listingTypes) {
        byListingType[type] = (byListingType[type] || 0) + 1;
      }
    }

    return {
      total: favorites.length,
      byListingType,
    };
  }

  async toggleFavorite(
    propertyId: string,
    userId: string,
  ): Promise<{ isFavorite: boolean }> {
    const existing = await this.prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (existing) {
      await this.removeFavorite(propertyId, userId);
      return { isFavorite: false };
    } else {
      await this.addFavorite(propertyId, userId);
      return { isFavorite: true };
    }
  }

  private mapToResponseDto(favorite: {
    id: string;
    userId: string;
    propertyId: string;
    createdAt: Date;
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
      noAgents: boolean;
      media: Array<{ url: string }>;
    };
  }): FavoritePropertyResponseDto {
    return {
      id: favorite.id,
      propertyId: favorite.propertyId,
      userId: favorite.userId,
      createdAt: favorite.createdAt,
      property: {
        id: favorite.property.id,
        title: favorite.property.title,
        city: favorite.property.city,
        country: favorite.property.country,
        listingTypes: favorite.property.listingTypes,
        basePrice: favorite.property.basePrice.toString(),
        currency: favorite.property.currency,
        squareMeters: favorite.property.squareMeters || undefined,
        bedrooms: favorite.property.bedrooms || undefined,
        bathrooms: favorite.property.bathrooms || undefined,
        status: favorite.property.status,
        primaryImageUrl: favorite.property.media[0]?.url,
        noAgents: favorite.property.noAgents,
      },
    };
  }
}
