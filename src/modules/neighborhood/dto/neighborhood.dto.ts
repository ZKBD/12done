import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AmenityCategory, SchoolLevel, RiskLevel } from '@prisma/client';

// ============================================
// Request DTOs
// ============================================

export class LocationQueryDto {
  @ApiProperty({ description: 'Latitude', example: 34.0522 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: -118.2437 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers', example: 1.5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(50)
  radiusKm?: number;
}

export class GetNeighborhoodDataDto extends LocationQueryDto {}

export class GetSchoolsDto extends LocationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by school level', enum: SchoolLevel })
  @IsEnum(SchoolLevel)
  @IsOptional()
  level?: SchoolLevel;

  @ApiPropertyOptional({ description: 'Minimum rating (1-10)', example: 7 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  minRating?: number;
}

export class GetAmenitiesDto extends LocationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: AmenityCategory })
  @IsEnum(AmenityCategory)
  @IsOptional()
  category?: AmenityCategory;

  @ApiPropertyOptional({ description: 'Categories to include', type: [String] })
  @IsArray()
  @IsEnum(AmenityCategory, { each: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  categories?: AmenityCategory[];

  @ApiPropertyOptional({ description: 'Maximum results per category', example: 5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class GetClimateRiskDto extends LocationQueryDto {}

export class GetWalkabilityDto extends LocationQueryDto {
  @ApiPropertyOptional({ description: 'Categories to check walking time for', type: [String] })
  @IsArray()
  @IsEnum(AmenityCategory, { each: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  categories?: AmenityCategory[];
}

export class GetPropertyNeighborhoodDto {
  @ApiProperty({ description: 'Property ID' })
  @IsString()
  propertyId: string;
}

// ============================================
// Response DTOs
// ============================================

export class MobilityScoresDto {
  @ApiProperty({ description: 'Walk Score (0-100)', example: 85 })
  walkScore: number;

  @ApiProperty({ description: 'Transit Score (0-100)', example: 72 })
  transitScore: number;

  @ApiProperty({ description: 'Bike Score (0-100)', example: 68 })
  bikeScore: number;

  @ApiPropertyOptional({ description: 'Walk Score description' })
  walkDescription?: string;

  @ApiPropertyOptional({ description: 'Transit Score description' })
  transitDescription?: string;

  @ApiPropertyOptional({ description: 'Bike Score description' })
  bikeDescription?: string;
}

export class SafetyDataDto {
  @ApiProperty({ description: 'Safety Score (0-100)', example: 75 })
  safetyScore: number;

  @ApiProperty({ description: 'Crime rating', example: 'LOW' })
  crimeRating: string;

  @ApiPropertyOptional({ description: 'Violent crime rate per 1000' })
  violentCrimeRate?: number;

  @ApiPropertyOptional({ description: 'Property crime rate per 1000' })
  propertyCrimeRate?: number;

  @ApiPropertyOptional({ description: 'Comparison to national average' })
  comparedToNational?: string;
}

export class DemographicsDto {
  @ApiPropertyOptional({ description: 'Total population' })
  population?: number;

  @ApiPropertyOptional({ description: 'Median age' })
  medianAge?: number;

  @ApiPropertyOptional({ description: 'Median household income' })
  medianIncome?: number;

  @ApiPropertyOptional({ description: 'Percentage of families' })
  familyPercentage?: number;
}

export class EnvironmentalDataDto {
  @ApiPropertyOptional({ description: 'Noise level', example: 'LOW' })
  noiseLevel?: string;

  @ApiPropertyOptional({ description: 'Air Quality Index', example: 42 })
  airQuality?: number;

  @ApiPropertyOptional({ description: 'AQI description', example: 'Good' })
  airQualityDescription?: string;

  @ApiPropertyOptional({ description: 'Pollen level', example: 'MODERATE' })
  pollenLevel?: string;
}

export class NeighborhoodDataResponseDto {
  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;

  @ApiPropertyOptional({ description: 'Neighborhood name' })
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  state?: string;

  @ApiPropertyOptional({ description: 'AI-generated description' })
  aiDescription?: string;

  @ApiProperty({ description: 'Mobility scores' })
  mobilityScores: MobilityScoresDto;

  @ApiProperty({ description: 'Safety data' })
  safety: SafetyDataDto;

  @ApiPropertyOptional({ description: 'Demographics data' })
  demographics?: DemographicsDto;

  @ApiPropertyOptional({ description: 'Environmental data' })
  environmental?: EnvironmentalDataDto;
}

export class SchoolResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: SchoolLevel })
  level: SchoolLevel;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  studentCount?: number;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  distanceKm?: number;

  @ApiPropertyOptional()
  walkingMinutes?: number;

  @ApiPropertyOptional()
  drivingMinutes?: number;

  @ApiPropertyOptional()
  publicPrivate?: string;

  @ApiPropertyOptional()
  schoolDistrict?: string;

  @ApiPropertyOptional()
  grades?: string;
}

export class SchoolsResponseDto {
  @ApiProperty({ type: [SchoolResponseDto] })
  schools: SchoolResponseDto[];

  @ApiProperty()
  total: number;

  @ApiPropertyOptional({ description: 'Nearby elementary schools' })
  elementary?: SchoolResponseDto[];

  @ApiPropertyOptional({ description: 'Nearby middle schools' })
  middle?: SchoolResponseDto[];

  @ApiPropertyOptional({ description: 'Nearby high schools' })
  high?: SchoolResponseDto[];
}

export class AmenityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AmenityCategory })
  category: AmenityCategory;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  distanceMeters: number;

  @ApiPropertyOptional()
  walkingMinutes?: number;

  @ApiPropertyOptional()
  drivingMinutes?: number;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  priceLevel?: number;

  @ApiPropertyOptional()
  isOpenNow?: boolean;

  @ApiPropertyOptional()
  photoUrl?: string;
}

export class AmenitiesResponseDto {
  @ApiProperty({ type: [AmenityResponseDto] })
  amenities: AmenityResponseDto[];

  @ApiProperty()
  total: number;

  @ApiPropertyOptional({ description: 'Grouped by category' })
  byCategory?: Record<string, AmenityResponseDto[]>;
}

export class ClimateRiskResponseDto {
  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ enum: RiskLevel })
  overallRiskLevel: RiskLevel;

  @ApiPropertyOptional()
  overallRiskScore?: number;

  @ApiProperty({ description: 'Flood risk details' })
  flood: {
    level: RiskLevel;
    zone?: string;
    insuranceRequired: boolean;
  };

  @ApiProperty({ description: 'Fire risk details' })
  fire: {
    level: RiskLevel;
  };

  @ApiProperty({ description: 'Earthquake risk details' })
  earthquake: {
    level: RiskLevel;
  };

  @ApiProperty({ description: 'Hurricane risk details' })
  hurricane: {
    level: RiskLevel;
  };

  @ApiProperty({ description: 'Tornado risk details' })
  tornado: {
    level: RiskLevel;
  };

  @ApiPropertyOptional({ description: 'Historical climate events' })
  historicalEvents?: Array<{
    type: string;
    date: string;
    severity: string;
    description?: string;
  }>;

  @ApiPropertyOptional({ description: 'Insurance notes' })
  insuranceNotes?: string;
}

export class WalkabilityItemDto {
  @ApiProperty({ enum: AmenityCategory })
  category: AmenityCategory;

  @ApiProperty()
  nearestName: string;

  @ApiProperty()
  distanceMeters: number;

  @ApiProperty()
  walkingMinutes: number;
}

export class WalkabilityResponseDto {
  @ApiProperty({ type: [WalkabilityItemDto] })
  items: WalkabilityItemDto[];

  @ApiProperty({ description: 'Average walking time to amenities' })
  averageWalkingMinutes: number;

  @ApiProperty({ description: 'Number of categories within 10 min walk' })
  within10Minutes: number;
}

export class FutureDevelopmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectType: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  developer?: string;

  @ApiPropertyOptional()
  plannedStart?: Date;

  @ApiPropertyOptional()
  expectedEnd?: Date;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  distanceKm?: number;
}

export class FutureDevelopmentsResponseDto {
  @ApiProperty({ type: [FutureDevelopmentDto] })
  developments: FutureDevelopmentDto[];

  @ApiProperty()
  total: number;
}

// Complete neighborhood profile for a property
export class PropertyNeighborhoodProfileDto {
  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state?: string;
    neighborhood?: string;
  };

  @ApiProperty()
  mobilityScores: MobilityScoresDto;

  @ApiProperty()
  safety: SafetyDataDto;

  @ApiProperty()
  schools: SchoolsResponseDto;

  @ApiProperty()
  nearbyAmenities: AmenitiesResponseDto;

  @ApiProperty()
  climateRisk: ClimateRiskResponseDto;

  @ApiPropertyOptional()
  walkability?: WalkabilityResponseDto;

  @ApiPropertyOptional()
  demographics?: DemographicsDto;

  @ApiPropertyOptional()
  environmental?: EnvironmentalDataDto;

  @ApiPropertyOptional()
  futureDevelopments?: FutureDevelopmentsResponseDto;
}
