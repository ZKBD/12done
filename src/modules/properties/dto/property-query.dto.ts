import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsISO31661Alpha2,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ListingType, PropertyStatus, EnergyEfficiencyRating } from '@prisma/client';
import { PaginationQueryDto } from '@/common/dto';

export class PropertyQueryDto extends PaginationQueryDto {
  // Text search
  @ApiPropertyOptional({
    description: 'Search in title, description, city, address',
    example: 'Budapest apartment',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // Location filters
  @ApiPropertyOptional({
    description: 'Filter by country (ISO 3166-1 alpha-2)',
    example: 'HU',
  })
  @IsOptional()
  @IsISO31661Alpha2()
  @Transform(({ value }) => value?.toUpperCase())
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Budapest',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by postal code',
    example: '1011',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  // Listing type filter
  @ApiPropertyOptional({
    description: 'Filter by listing types (can specify multiple)',
    enum: ListingType,
    isArray: true,
    example: [ListingType.FOR_SALE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ListingType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  listingTypes?: ListingType[];

  // Status filter
  @ApiPropertyOptional({
    description: 'Filter by property status',
    enum: PropertyStatus,
    example: PropertyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  // Price range
  @ApiPropertyOptional({
    description: 'Minimum price',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  // Size filters
  @ApiPropertyOptional({
    description: 'Minimum square meters',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minSquareMeters?: number;

  @ApiPropertyOptional({
    description: 'Maximum square meters',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxSquareMeters?: number;

  // Room filters
  @ApiPropertyOptional({
    description: 'Minimum bedrooms',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  minBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Maximum bedrooms',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  maxBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Minimum bathrooms',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  minBathrooms?: number;

  // Year built range
  @ApiPropertyOptional({
    description: 'Minimum year built',
    example: 2000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1800)
  @Type(() => Number)
  minYearBuilt?: number;

  @ApiPropertyOptional({
    description: 'Maximum year built',
    example: 2024,
  })
  @IsOptional()
  @IsNumber()
  @Max(2100)
  @Type(() => Number)
  maxYearBuilt?: number;

  // Feature filters
  @ApiPropertyOptional({
    description: 'Filter pet-friendly properties',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  petFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter newly built properties',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  newlyBuilt?: boolean;

  @ApiPropertyOptional({
    description: 'Filter accessible properties',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  accessible?: boolean;

  @ApiPropertyOptional({
    description: 'Filter no-agents properties (PROD-026)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  noAgents?: boolean;

  @ApiPropertyOptional({
    description: 'Filter properties with upcoming open house events (PROD-048)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasUpcomingOpenHouse?: boolean;

  // Energy efficiency
  @ApiPropertyOptional({
    description: 'Minimum energy efficiency rating',
    enum: EnergyEfficiencyRating,
    example: EnergyEfficiencyRating.C,
  })
  @IsOptional()
  @IsEnum(EnergyEfficiencyRating)
  minEnergyEfficiency?: EnergyEfficiencyRating;

  // Geo filters for map view
  @ApiPropertyOptional({
    description: 'Southwest latitude for bounding box',
    example: 47.3,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  swLat?: number;

  @ApiPropertyOptional({
    description: 'Southwest longitude for bounding box',
    example: 18.8,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  swLng?: number;

  @ApiPropertyOptional({
    description: 'Northeast latitude for bounding box',
    example: 47.6,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  neLat?: number;

  @ApiPropertyOptional({
    description: 'Northeast longitude for bounding box',
    example: 19.2,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  neLng?: number;

  // Owner filter (admin/own properties)
  @ApiPropertyOptional({
    description: 'Filter by owner ID',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  // Sorting
  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['createdAt', 'basePrice', 'squareMeters', 'bedrooms'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'basePrice' | 'squareMeters' | 'bedrooms';
}
