import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingType, PropertyStatus } from '@prisma/client';

export class FavoritePropertyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Property details' })
  property?: {
    id: string;
    title: string;
    city: string;
    country: string;
    listingTypes: ListingType[];
    basePrice: string;
    currency: string;
    squareMeters?: number;
    bedrooms?: number;
    bathrooms?: number;
    status: PropertyStatus;
    primaryImageUrl?: string;
    noAgents: boolean;
  };
}

export class FavoriteStatsDto {
  @ApiProperty({ description: 'Total number of favorites' })
  total: number;

  @ApiProperty({ description: 'Favorites by listing type' })
  byListingType: Record<string, number>;
}
