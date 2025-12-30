import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsBoolean, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingType, PropertyStatus } from '@prisma/client';

export class RecommendationQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of recommendations to return',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by listing type',
    enum: ListingType,
  })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({
    description: 'Minimum confidence score (0-1)',
    default: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minConfidence?: number;
}

export class SimilarPropertiesQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of similar properties to return',
    default: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(20)
  limit?: number;
}

export class RecommendationFeedbackDto {
  @ApiProperty({
    description: 'Whether the recommendation was helpful (thumbs up/down)',
  })
  @IsBoolean()
  isPositive: boolean;
}

export class PropertySummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;

  @ApiProperty({ enum: ListingType, isArray: true })
  listingTypes: ListingType[];

  @ApiProperty()
  basePrice: string;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  squareMeters?: number;

  @ApiPropertyOptional()
  bedrooms?: number;

  @ApiPropertyOptional()
  bathrooms?: number;

  @ApiProperty({ enum: PropertyStatus })
  status: PropertyStatus;

  @ApiPropertyOptional()
  primaryImageUrl?: string;
}

export class RecommendationResponseDto {
  @ApiProperty({ type: PropertySummaryDto })
  property: PropertySummaryDto;

  @ApiProperty({
    description: 'Overall recommendation score (0-1)',
    minimum: 0,
    maximum: 1,
  })
  score: number;

  @ApiProperty({
    description: 'Human-readable explanation of why this was recommended',
    example: 'Similar to properties you viewed in Budapest',
  })
  explanation: string;

  @ApiProperty({
    description: 'Criteria that matched user preferences',
    isArray: true,
    example: ['2+ bedrooms', 'Under €300,000', 'Budapest'],
  })
  matchedCriteria: string[];

  @ApiProperty({
    description: 'Confidence in this recommendation (0-1)',
    minimum: 0,
    maximum: 1,
  })
  confidence: number;
}

export class SimilarPropertyResponseDto {
  @ApiProperty({ type: PropertySummaryDto })
  property: PropertySummaryDto;

  @ApiProperty({
    description: 'Similarity score (0-1)',
    minimum: 0,
    maximum: 1,
  })
  similarity: number;

  @ApiProperty({
    description: 'What aspects are similar',
    isArray: true,
    example: ['Same location', 'Similar price', '2 bedrooms'],
  })
  sharedAttributes: string[];
}

export class RecommendationFeedbackResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  isPositive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class UserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred price range',
  })
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };

  @ApiPropertyOptional({
    description: 'Preferred locations',
  })
  locations?: {
    cities: string[];
    countries: string[];
  };

  @ApiPropertyOptional({
    description: 'Preferred size range in square meters',
  })
  sizeRange?: {
    min: number;
    max: number;
  };

  @ApiPropertyOptional({
    description: 'Preferred bedroom count range',
  })
  bedrooms?: {
    min: number;
    max: number;
  };

  @ApiPropertyOptional({
    description: 'Preferred features',
  })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Preferred listing types',
    enum: ListingType,
    isArray: true,
  })
  listingTypes?: ListingType[];

  @ApiProperty({
    description: 'Amount of preference data available (affects confidence)',
  })
  dataPoints: number;
}
