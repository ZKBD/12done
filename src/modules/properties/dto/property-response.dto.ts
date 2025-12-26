import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ListingType,
  PropertyStatus,
  EnergyEfficiencyRating,
} from '@prisma/client';

export class PropertyMediaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  caption?: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class FloorPlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;
}

export class PropertyOwnerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  idVerificationStatus: string;
}

export class PropertyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional({ type: PropertyOwnerResponseDto })
  owner?: PropertyOwnerResponseDto;

  // Location
  @ApiProperty()
  address: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  // Basic Info
  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  aiGeneratedDescription?: string;

  @ApiPropertyOptional()
  descriptionTone?: string;

  // Listing Types
  @ApiProperty({ enum: ListingType, isArray: true })
  listingTypes: ListingType[];

  // Pricing
  @ApiProperty()
  basePrice: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  priceNegotiable: boolean;

  @ApiPropertyOptional()
  negotiabilityRange?: string;

  @ApiProperty()
  dynamicPricingEnabled: boolean;

  // Dimensions
  @ApiPropertyOptional()
  squareMeters?: number;

  @ApiPropertyOptional()
  lotSize?: number;

  @ApiPropertyOptional()
  bedrooms?: number;

  @ApiPropertyOptional()
  bathrooms?: number;

  @ApiPropertyOptional()
  floors?: number;

  @ApiPropertyOptional()
  yearBuilt?: number;

  // Energy & Utilities
  @ApiProperty({ enum: EnergyEfficiencyRating })
  energyEfficiency: EnergyEfficiencyRating;

  @ApiPropertyOptional()
  energyCertificateUrl?: string;

  @ApiPropertyOptional()
  hoaFees?: string;

  @ApiPropertyOptional()
  hoaInfo?: string;

  // Features
  @ApiProperty()
  petFriendly: boolean;

  @ApiProperty()
  newlyBuilt: boolean;

  @ApiProperty()
  accessible: boolean;

  @ApiProperty()
  noAgents: boolean;

  // Status
  @ApiProperty({ enum: PropertyStatus })
  status: PropertyStatus;

  @ApiPropertyOptional()
  publishedAt?: Date;

  // Relations
  @ApiPropertyOptional({ type: [PropertyMediaResponseDto] })
  media?: PropertyMediaResponseDto[];

  @ApiPropertyOptional({ type: [FloorPlanResponseDto] })
  floorPlans?: FloorPlanResponseDto[];

  // Counts
  @ApiPropertyOptional()
  favoriteCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PropertyListResponseDto {
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

  @ApiPropertyOptional({ description: 'Primary image URL' })
  primaryImageUrl?: string;

  @ApiProperty()
  noAgents: boolean;

  @ApiProperty()
  createdAt: Date;
}
