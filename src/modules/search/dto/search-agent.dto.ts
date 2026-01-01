import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationFrequency } from '@prisma/client';

export class SearchCriteriaDto {
  @ApiPropertyOptional({ description: 'Search text query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Listing types', isArray: true })
  @IsOptional()
  listingTypes?: string[];

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum square meters' })
  @IsOptional()
  minSquareMeters?: number;

  @ApiPropertyOptional({ description: 'Maximum square meters' })
  @IsOptional()
  maxSquareMeters?: number;

  @ApiPropertyOptional({ description: 'Minimum bedrooms' })
  @IsOptional()
  minBedrooms?: number;

  @ApiPropertyOptional({ description: 'Maximum bedrooms' })
  @IsOptional()
  maxBedrooms?: number;

  @ApiPropertyOptional({ description: 'Minimum bathrooms' })
  @IsOptional()
  minBathrooms?: number;

  @ApiPropertyOptional({ description: 'Pet-friendly filter' })
  @IsOptional()
  petFriendly?: boolean;

  @ApiPropertyOptional({ description: 'Newly built filter' })
  @IsOptional()
  newlyBuilt?: boolean;

  @ApiPropertyOptional({ description: 'Accessible filter' })
  @IsOptional()
  accessible?: boolean;

  @ApiPropertyOptional({ description: 'No-agents filter' })
  @IsOptional()
  noAgents?: boolean;

  @ApiPropertyOptional({ description: 'Year built minimum' })
  @IsOptional()
  minYearBuilt?: number;

  @ApiPropertyOptional({ description: 'Year built maximum' })
  @IsOptional()
  maxYearBuilt?: number;

  // Geo filters (PROD-043.9 - Saved polygon/radius for search agents)
  @ApiPropertyOptional({
    description: 'Polygon coordinates for custom area search',
    example: [{ lat: 47.5, lng: 19.0 }, { lat: 47.6, lng: 19.0 }, { lat: 47.6, lng: 19.2 }],
  })
  @IsOptional()
  polygon?: Array<{ lat: number; lng: number }>;

  @ApiPropertyOptional({ description: 'Center latitude for radius search' })
  @IsOptional()
  centerLat?: number;

  @ApiPropertyOptional({ description: 'Center longitude for radius search' })
  @IsOptional()
  centerLng?: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers' })
  @IsOptional()
  radiusKm?: number;

  // Allow any additional criteria
  [key: string]: unknown;
}

export class CreateSearchAgentDto {
  @ApiProperty({
    description: 'Name for this search agent',
    example: 'Downtown apartments under 300k',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Search criteria to match against new listings',
    type: SearchCriteriaDto,
  })
  @IsObject()
  criteria: SearchCriteriaDto;

  @ApiPropertyOptional({
    description: 'Enable email notifications for matches',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable in-app notifications for matches',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inAppNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Notification frequency for email notifications',
    enum: NotificationFrequency,
    default: NotificationFrequency.INSTANT,
    example: 'INSTANT',
  })
  @IsOptional()
  @IsEnum(NotificationFrequency)
  notificationFrequency?: NotificationFrequency;
}

export class UpdateSearchAgentDto {
  @ApiPropertyOptional({
    description: 'Name for this search agent',
    example: 'Downtown apartments under 300k',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Search criteria to match against new listings',
    type: SearchCriteriaDto,
  })
  @IsOptional()
  @IsObject()
  criteria?: SearchCriteriaDto;

  @ApiPropertyOptional({
    description: 'Enable email notifications for matches',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable in-app notifications for matches',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inAppNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Is the search agent active?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Notification frequency for email notifications',
    enum: NotificationFrequency,
    example: 'DAILY_DIGEST',
  })
  @IsOptional()
  @IsEnum(NotificationFrequency)
  notificationFrequency?: NotificationFrequency;
}

export class SearchAgentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  criteria: SearchCriteriaDto;

  @ApiProperty()
  emailNotifications: boolean;

  @ApiProperty()
  inAppNotifications: boolean;

  @ApiProperty({ enum: NotificationFrequency })
  notificationFrequency: NotificationFrequency;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastTriggeredAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
