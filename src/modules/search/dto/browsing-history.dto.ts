import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ListingType, PropertyStatus } from '@prisma/client';

export class TrackViewDto {
  @ApiPropertyOptional({
    description: 'Time spent viewing property in seconds',
    minimum: 0,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3600)
  duration?: number;
}

export class BrowsingHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  viewedAt: Date;

  @ApiPropertyOptional({ description: 'Time spent viewing in seconds' })
  duration?: number;

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
  };
}

export class BrowsingHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of history items to return',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of days to look back',
    default: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}
