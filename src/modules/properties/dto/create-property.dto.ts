import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsPositive,
  Min,
  Max,
  MaxLength,
  IsISO31661Alpha2,
  IsDecimal,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ListingType, EnergyEfficiencyRating } from '@prisma/client';

export class CreatePropertyDto {
  // Location
  @ApiProperty({
    description: 'Street address of the property',
    example: '123 Main Street',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiProperty({
    description: 'Postal/ZIP code',
    example: '1011',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({
    description: 'City name',
    example: 'Budapest',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'HU',
  })
  @IsISO31661Alpha2()
  @Transform(({ value }) => value?.toUpperCase())
  country: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 47.4979,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 19.0402,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  // Basic Info
  @ApiProperty({
    description: 'Property title/headline',
    example: 'Beautiful 3-bedroom apartment in downtown Budapest',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Property description',
    example: 'Spacious and bright apartment with modern amenities...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  // Listing Types
  @ApiProperty({
    description: 'Types of listing (multi-select)',
    enum: ListingType,
    isArray: true,
    example: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ListingType, { each: true })
  listingTypes: ListingType[];

  // Pricing
  @ApiProperty({
    description: 'Base price in the specified currency',
    example: '250000.00',
  })
  @IsString()
  @IsNotEmpty()
  basePrice: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'EUR',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Whether the price is negotiable',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  priceNegotiable?: boolean;

  @ApiPropertyOptional({
    description: 'Negotiability range as percentage (e.g., 10.00 means ±10%)',
    example: '10.00',
  })
  @IsOptional()
  @IsString()
  negotiabilityRange?: string;

  // Dimensions
  @ApiPropertyOptional({
    description: 'Living area in square meters',
    example: 85.5,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  squareMeters?: number;

  @ApiPropertyOptional({
    description: 'Lot/land size in square meters',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  lotSize?: number;

  @ApiPropertyOptional({
    description: 'Number of bedrooms',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of floors/stories',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  floors?: number;

  @ApiPropertyOptional({
    description: 'Year the property was built',
    example: 2015,
  })
  @IsOptional()
  @IsNumber()
  @Min(1800)
  @Max(2100)
  @Type(() => Number)
  yearBuilt?: number;

  // Energy & Utilities
  @ApiPropertyOptional({
    description: 'Energy efficiency rating',
    enum: EnergyEfficiencyRating,
    example: EnergyEfficiencyRating.B,
    default: EnergyEfficiencyRating.NOT_RATED,
  })
  @IsOptional()
  @IsEnum(EnergyEfficiencyRating)
  energyEfficiency?: EnergyEfficiencyRating;

  @ApiPropertyOptional({
    description: 'URL to energy certificate document',
    example: 'https://example.com/certificates/123.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  energyCertificateUrl?: string;

  @ApiPropertyOptional({
    description: 'Monthly HOA fees',
    example: '150.00',
  })
  @IsOptional()
  @IsString()
  hoaFees?: string;

  @ApiPropertyOptional({
    description: 'HOA information and rules',
    example: 'Monthly meetings, pet-friendly, no short-term rentals',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hoaInfo?: string;

  // Features
  @ApiPropertyOptional({
    description: 'Is the property pet-friendly?',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  petFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Is this a new construction?',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  newlyBuilt?: boolean;

  @ApiPropertyOptional({
    description: 'Is the property accessible (wheelchair, etc.)?',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  accessible?: boolean;

  @ApiPropertyOptional({
    description: 'No agents allowed flag (PROD-026)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  noAgents?: boolean;

  @ApiPropertyOptional({
    description: 'Enable dynamic pricing for short-term rentals',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  dynamicPricingEnabled?: boolean;
}
