import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VoiceStyle, PoiType, InterestCategory } from '@prisma/client';

// ============================================
// POI DTOs (PROD-121, PROD-122)
// ============================================

export class NearbyPoiQueryDto {
  @ApiProperty({ description: 'Latitude of the search center' })
  @IsLatitude()
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @ApiProperty({ description: 'Longitude of the search center' })
  @IsLongitude()
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @ApiPropertyOptional({ description: 'Search radius in meters', default: 500 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(5000)
  @Transform(({ value }) => parseInt(value, 10))
  radius?: number = 500;

  @ApiPropertyOptional({
    description: 'Filter by POI types',
    type: [String],
    enum: PoiType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PoiType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  types?: PoiType[];

  @ApiPropertyOptional({ description: 'Maximum results to return', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;
}

export class PoiDetailsQueryDto {
  @ApiProperty({ description: 'Google Places ID' })
  @IsString()
  placeId: string;

  @ApiPropertyOptional({ description: 'Language for the response', default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string = 'en';
}

export class PoiResponseDto {
  @ApiProperty({ description: 'Google Places ID' })
  placeId: string;

  @ApiProperty({ description: 'Name of the place' })
  name: string;

  @ApiProperty({ description: 'POI type category' })
  type: PoiType;

  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;

  @ApiPropertyOptional({ description: 'Address' })
  address?: string;

  @ApiPropertyOptional({ description: 'Distance from query point in meters' })
  distance?: number;

  @ApiPropertyOptional({ description: 'Rating (0-5)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Number of reviews' })
  reviewCount?: number;

  @ApiPropertyOptional({ description: 'Price level (0-4)' })
  priceLevel?: number;

  @ApiPropertyOptional({ description: 'Opening hours' })
  openingHours?: string[];

  @ApiPropertyOptional({ description: 'Whether currently open' })
  isOpen?: boolean;

  @ApiPropertyOptional({ description: 'Photo URL' })
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;
}

// ============================================
// Narration DTOs (PROD-123, PROD-127)
// ============================================

export class NarrationRequestDto {
  @ApiProperty({ description: 'Google Places ID' })
  @IsString()
  placeId: string;

  @ApiPropertyOptional({
    description: 'Voice style for narration',
    enum: VoiceStyle,
    default: VoiceStyle.FRIENDLY,
  })
  @IsOptional()
  @IsEnum(VoiceStyle)
  voiceStyle?: VoiceStyle = VoiceStyle.FRIENDLY;

  @ApiPropertyOptional({ description: 'Language for narration', default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string = 'en';

  @ApiPropertyOptional({
    description: 'Filter by interest categories',
    type: [String],
    enum: InterestCategory,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InterestCategory, { each: true })
  interests?: InterestCategory[];
}

export class NarrationResponseDto {
  @ApiProperty({ description: 'Google Places ID' })
  placeId: string;

  @ApiProperty({ description: 'Place name' })
  placeName: string;

  @ApiProperty({ description: 'Generated narration text' })
  narration: string;

  @ApiProperty({ description: 'Voice style used' })
  voiceStyle: VoiceStyle;

  @ApiProperty({ description: 'Language used' })
  language: string;

  @ApiPropertyOptional({ description: 'Interests the narration focuses on' })
  interests?: InterestCategory[];

  @ApiProperty({ description: 'Estimated speaking duration in seconds' })
  estimatedDuration: number;
}

// ============================================
// Navigation DTOs (PROD-124)
// ============================================

export class NavigationRequestDto {
  @ApiProperty({ description: 'Starting latitude' })
  @IsLatitude()
  @Transform(({ value }) => parseFloat(value))
  fromLatitude: number;

  @ApiProperty({ description: 'Starting longitude' })
  @IsLongitude()
  @Transform(({ value }) => parseFloat(value))
  fromLongitude: number;

  @ApiProperty({ description: 'Destination latitude' })
  @IsLatitude()
  @Transform(({ value }) => parseFloat(value))
  toLatitude: number;

  @ApiProperty({ description: 'Destination longitude' })
  @IsLongitude()
  @Transform(({ value }) => parseFloat(value))
  toLongitude: number;

  @ApiPropertyOptional({ description: 'Language for instructions', default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string = 'en';
}

export class NavigationStepDto {
  @ApiProperty({ description: 'Step instruction' })
  instruction: string;

  @ApiProperty({ description: 'Distance in meters' })
  distance: number;

  @ApiProperty({ description: 'Duration in seconds' })
  duration: number;

  @ApiPropertyOptional({ description: 'Maneuver type' })
  maneuver?: string;

  @ApiProperty({ description: 'Start latitude' })
  startLatitude: number;

  @ApiProperty({ description: 'Start longitude' })
  startLongitude: number;

  @ApiProperty({ description: 'End latitude' })
  endLatitude: number;

  @ApiProperty({ description: 'End longitude' })
  endLongitude: number;
}

export class NavigationResponseDto {
  @ApiProperty({ description: 'Total distance in meters' })
  totalDistance: number;

  @ApiProperty({ description: 'Total duration in seconds' })
  totalDuration: number;

  @ApiProperty({ description: 'Navigation steps', type: [NavigationStepDto] })
  steps: NavigationStepDto[];

  @ApiProperty({ description: 'Encoded polyline for the route' })
  polyline: string;
}

// ============================================
// Tour Preferences DTOs (PROD-127, PROD-133)
// ============================================

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Voice style for narration',
    enum: VoiceStyle,
  })
  @IsOptional()
  @IsEnum(VoiceStyle)
  voiceStyle?: VoiceStyle;

  @ApiPropertyOptional({ description: 'Preferred language' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({
    description: 'Interest categories',
    type: [String],
    enum: InterestCategory,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InterestCategory, { each: true })
  @ArrayMaxSize(10)
  interests?: InterestCategory[];

  @ApiPropertyOptional({ description: 'Enable Follow Me mode' })
  @IsOptional()
  @IsBoolean()
  followMeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'POI detection radius in meters' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  poiRadius?: number;
}

export class PreferencesResponseDto {
  @ApiProperty({ description: 'Preference ID' })
  id: string;

  @ApiProperty({ description: 'Voice style' })
  voiceStyle: VoiceStyle;

  @ApiProperty({ description: 'Language code' })
  language: string;

  @ApiProperty({ description: 'Interest categories' })
  interests: InterestCategory[];

  @ApiProperty({ description: 'Follow Me mode enabled' })
  followMeEnabled: boolean;

  @ApiProperty({ description: 'POI radius in meters' })
  poiRadius: number;
}

// ============================================
// Saved Places DTOs (PROD-130)
// ============================================

export class SavePlaceDto {
  @ApiProperty({ description: 'Google Places ID' })
  @IsString()
  placeId: string;

  @ApiProperty({ description: 'Place name' })
  @IsString()
  @MaxLength(200)
  placeName: string;

  @ApiPropertyOptional({ description: 'POI type', enum: PoiType })
  @IsOptional()
  @IsEnum(PoiType)
  placeType?: PoiType;

  @ApiProperty({ description: 'Latitude' })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'User notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateSavedPlaceDto {
  @ApiPropertyOptional({ description: 'User notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class SavedPlaceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  placeId: string;

  @ApiProperty()
  placeName: string;

  @ApiProperty({ enum: PoiType })
  placeType: PoiType;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;
}

// ============================================
// Custom Tours DTOs (PROD-131)
// ============================================

export class TourStopDto {
  @ApiProperty({ description: 'Google Places ID' })
  @IsString()
  placeId: string;

  @ApiProperty({ description: 'Place name' })
  @IsString()
  @MaxLength(200)
  placeName: string;

  @ApiPropertyOptional({ description: 'POI type', enum: PoiType })
  @IsOptional()
  @IsEnum(PoiType)
  placeType?: PoiType;

  @ApiProperty({ description: 'Latitude' })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Time to spend at this stop in minutes', default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  stayDuration?: number = 15;

  @ApiPropertyOptional({ description: 'Custom narration text for this stop' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  customNarration?: string;
}

export class CreateTourDto {
  @ApiProperty({ description: 'Tour name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Tour description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Make tour public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiProperty({ description: 'Tour stops in order', type: [TourStopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourStopDto)
  @ArrayMaxSize(20)
  stops: TourStopDto[];
}

export class UpdateTourDto {
  @ApiPropertyOptional({ description: 'Tour name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Tour description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Make tour public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ReorderStopsDto {
  @ApiProperty({ description: 'Stop IDs in new order' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(20)
  stopIds: string[];
}

export class TourStopResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  placeId: string;

  @ApiProperty()
  placeName: string;

  @ApiProperty({ enum: PoiType })
  placeType: PoiType;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  orderIndex: number;

  @ApiPropertyOptional()
  arrivalDuration?: number;

  @ApiProperty()
  stayDuration: number;

  @ApiPropertyOptional()
  customNarration?: string;
}

export class TourResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isPublic: boolean;

  @ApiPropertyOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional()
  totalDistance?: number;

  @ApiProperty({ type: [TourStopResponseDto] })
  stops: TourStopResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// User Notes DTOs (PROD-132)
// ============================================

export class NotePhotoDto {
  @ApiProperty({ description: 'Photo URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Photo caption' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Google Places ID' })
  @IsString()
  placeId: string;

  @ApiPropertyOptional({ description: 'Place name (for display)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeName?: string;

  @ApiProperty({ description: 'Note text' })
  @IsString()
  @MaxLength(5000)
  text: string;

  @ApiPropertyOptional({ description: 'Photo attachments', type: [NotePhotoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotePhotoDto)
  @ArrayMaxSize(10)
  photos?: NotePhotoDto[];
}

export class UpdateNoteDto {
  @ApiPropertyOptional({ description: 'Note text' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional({ description: 'Photo attachments', type: [NotePhotoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotePhotoDto)
  @ArrayMaxSize(10)
  photos?: NotePhotoDto[];
}

export class NoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  placeId: string;

  @ApiPropertyOptional()
  placeName?: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ type: [NotePhotoDto] })
  photos: NotePhotoDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
