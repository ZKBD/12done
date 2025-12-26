import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastTriggeredAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
