import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
  TOUR_360 = 'tour_360',
  TOUR_3D = 'tour_3d',
}

export class CreatePropertyMediaDto {
  @ApiProperty({
    description: 'Type of media',
    enum: MediaType,
    example: MediaType.PHOTO,
  })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({
    description: 'URL of the media file',
    example: 'https://cdn.12done.com/properties/abc123/photo1.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL for the media',
    example: 'https://cdn.12done.com/properties/abc123/photo1_thumb.jpg',
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Caption/description for the media',
    example: 'Living room with natural light',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;

  @ApiPropertyOptional({
    description: 'Sort order (lower = displayed first)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Is this the primary/featured image?',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPrimary?: boolean;
}

export class UpdatePropertyMediaDto {
  @ApiPropertyOptional({
    description: 'Caption/description for the media',
    example: 'Living room with natural light',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;

  @ApiPropertyOptional({
    description: 'Sort order (lower = displayed first)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Is this the primary/featured image?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPrimary?: boolean;
}

export class ReorderMediaDto {
  @ApiProperty({
    description: 'Array of media IDs in the desired order',
    example: ['id1', 'id2', 'id3'],
  })
  @IsString({ each: true })
  mediaIds: string[];
}

export class CreateFloorPlanDto {
  @ApiProperty({
    description: 'Name of the floor/level',
    example: 'Ground Floor',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'URL of the floor plan image',
    example: 'https://cdn.12done.com/properties/abc123/floor1.png',
  })
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Sort order (lower = displayed first)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateFloorPlanDto {
  @ApiPropertyOptional({
    description: 'Name of the floor/level',
    example: 'Ground Floor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'URL of the floor plan image',
    example: 'https://cdn.12done.com/properties/abc123/floor1.png',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Sort order (lower = displayed first)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
