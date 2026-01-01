import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsArray, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ListingType } from '@prisma/client';
import { PropertySummaryDto } from './recommendations.dto';

/**
 * Visual Search DTOs (PROD-045)
 * Handles image-based property search using perceptual hashing
 */

// Query parameters for visual search
export class VisualSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
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

  @ApiPropertyOptional({
    description: 'Minimum similarity score (0-1) to include in results',
    default: 0.3,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minSimilarity?: number;

  @ApiPropertyOptional({
    description: 'Filter by listing types',
    enum: ListingType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ListingType, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  listingTypes?: ListingType[];

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Budapest',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by country',
    example: 'Hungary',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

// Detailed visual match breakdown
export class VisualMatchDetailsDto {
  @ApiProperty({
    description: 'Structural similarity based on perceptual hash (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.92,
  })
  structural: number;

  @ApiProperty({
    description: 'Color palette similarity (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.78,
  })
  colorPalette: number;

  @ApiProperty({
    description: 'Composition/aspect ratio similarity (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.85,
  })
  composition: number;
}

// Matched image info
export class MatchedImageDto {
  @ApiProperty({
    description: 'URL of the matched image',
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL of the matched image',
  })
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'ID of the matched media',
  })
  mediaId: string;
}

// Image features extracted from an image
export class ImageFeaturesDto {
  @ApiProperty({
    description: 'Perceptual hash of the image (16 hex characters)',
    example: 'a9c3f7e12b4d8056',
  })
  pHash: string;

  @ApiProperty({
    description: 'Top 5 dominant colors as hex values',
    isArray: true,
    example: ['#FFFFFF', '#E5E5E5', '#2D3436', '#636E72', '#B2BEC3'],
  })
  dominantColors: string[];

  @ApiProperty({
    description: 'Aspect ratio (width/height)',
    example: 1.5,
  })
  aspectRatio: number;

  @ApiProperty({
    description: 'Average brightness (0-255)',
    example: 142.5,
  })
  brightness: number;
}

// Single visual search result
export class VisualSearchResultDto {
  @ApiProperty({ type: PropertySummaryDto })
  property: PropertySummaryDto;

  @ApiProperty({
    description: 'Overall similarity score (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.87,
  })
  similarity: number;

  @ApiProperty({ type: VisualMatchDetailsDto })
  visualMatch: VisualMatchDetailsDto;

  @ApiProperty({ type: MatchedImageDto })
  matchedImage: MatchedImageDto;

  @ApiProperty({
    description: 'Human-readable explanation of the visual similarity',
    example: 'Similar modern interior with open floor plan and natural lighting',
  })
  explanation: string;
}

// Response for visual search endpoint
export class VisualSearchResponseDto {
  @ApiProperty({
    description: 'List of visually similar properties',
    type: [VisualSearchResultDto],
  })
  results: VisualSearchResultDto[];

  @ApiProperty({
    description: 'Total number of matches found',
  })
  total: number;

  @ApiProperty({
    description: 'Features extracted from the uploaded image',
    type: ImageFeaturesDto,
  })
  uploadedImageFeatures: ImageFeaturesDto;

  @ApiProperty({
    description: 'Time taken to process the search in milliseconds',
  })
  processingTimeMs: number;
}

// Response for indexing property images
export class IndexPropertyImagesResponseDto {
  @ApiProperty({
    description: 'Property ID that was indexed',
  })
  propertyId: string;

  @ApiProperty({
    description: 'Number of images successfully indexed',
  })
  indexedCount: number;

  @ApiProperty({
    description: 'Number of images that failed to index',
  })
  failedCount: number;

  @ApiProperty({
    description: 'IDs of media that were indexed',
    isArray: true,
  })
  indexedMediaIds: string[];

  @ApiProperty({
    description: 'IDs of media that failed with error messages',
    isArray: true,
  })
  failures: { mediaId: string; error: string }[];
}

// DTO for batch indexing multiple properties
export class BatchIndexPropertiesDto {
  @ApiProperty({
    description: 'Property IDs to index',
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  propertyIds: string[];
}

export class BatchIndexResponseDto {
  @ApiProperty({
    description: 'Total properties processed',
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Total images indexed',
  })
  totalIndexed: number;

  @ApiProperty({
    description: 'Total failures',
  })
  totalFailed: number;

  @ApiProperty({
    description: 'Details per property',
    type: [IndexPropertyImagesResponseDto],
  })
  details: IndexPropertyImagesResponseDto[];
}
