import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { RoomType, StagingStyle, StagingStatus, TimeOfDay, Season } from '@prisma/client';

// ===== PROD-030: Virtual Staging DTOs =====

export class CreateStagingRequestDto {
  @ApiProperty({
    description: 'ID of the original media to stage',
    example: 'media-123',
  })
  @IsUUID()
  mediaId: string;

  @ApiProperty({
    enum: RoomType,
    description: 'Type of room in the photo',
    example: RoomType.LIVING_ROOM,
  })
  @IsEnum(RoomType)
  roomType: RoomType;

  @ApiProperty({
    enum: StagingStyle,
    description: 'Desired staging style',
    example: StagingStyle.MODERN,
  })
  @IsEnum(StagingStyle)
  style: StagingStyle;
}

export class StagingRequestResponseDto {
  @ApiProperty({ description: 'Staging request ID' })
  id: string;

  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Original media ID' })
  originalMediaId: string;

  @ApiProperty({ enum: RoomType })
  roomType: RoomType;

  @ApiProperty({ enum: StagingStyle })
  style: StagingStyle;

  @ApiProperty({ enum: StagingStatus })
  status: StagingStatus;

  @ApiPropertyOptional({ description: 'Staged media ID (when completed)' })
  stagedMediaId?: string | null;

  @ApiPropertyOptional({ description: 'Staged image URL (when completed)' })
  stagedUrl?: string | null;

  @ApiPropertyOptional({ description: 'Error message (if failed)' })
  errorMessage?: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: Date | null;
}

export class StagedMediaResponseDto {
  @ApiProperty({ description: 'Media ID' })
  id: string;

  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Media URL' })
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumbnailUrl?: string | null;

  @ApiProperty({ description: 'Is virtually staged' })
  isVirtuallyStaged: boolean;

  @ApiPropertyOptional({ enum: RoomType })
  roomType?: RoomType | null;

  @ApiPropertyOptional({ enum: StagingStyle })
  stagingStyle?: StagingStyle | null;

  @ApiPropertyOptional({ description: 'Original media ID' })
  originalMediaId?: string | null;

  @ApiProperty({ description: 'Caption' })
  caption?: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

// ===== PROD-031: Time-of-Day Photos DTOs =====

export class UpdateMediaTimeTagDto {
  @ApiPropertyOptional({
    enum: TimeOfDay,
    description: 'Time of day when photo was taken',
    example: TimeOfDay.NOON,
  })
  @IsOptional()
  @IsEnum(TimeOfDay)
  timeOfDay?: TimeOfDay;

  @ApiPropertyOptional({
    enum: Season,
    description: 'Season when photo was taken',
    example: Season.SUMMER,
  })
  @IsOptional()
  @IsEnum(Season)
  season?: Season;

  @ApiPropertyOptional({
    description: 'Group ID to link photos of same angle at different times',
    example: 'group-front-entrance',
  })
  @IsOptional()
  @IsString()
  photoGroupId?: string;
}

export class CreatePhotoGroupDto {
  @ApiProperty({
    description: 'Name/identifier for the photo group',
    example: 'front-entrance',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what this group captures',
    example: 'Front entrance view from street',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class TimeTaggedMediaResponseDto {
  @ApiProperty({ description: 'Media ID' })
  id: string;

  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Media URL' })
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumbnailUrl?: string | null;

  @ApiPropertyOptional({ enum: TimeOfDay })
  timeOfDay?: TimeOfDay | null;

  @ApiPropertyOptional({ enum: Season })
  season?: Season | null;

  @ApiPropertyOptional({ description: 'Photo group ID' })
  photoGroupId?: string | null;

  @ApiProperty({ description: 'Caption' })
  caption?: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class PhotoGroupResponseDto {
  @ApiProperty({ description: 'Group ID' })
  groupId: string;

  @ApiProperty({ description: 'Photos in this group', type: [TimeTaggedMediaResponseDto] })
  photos: TimeTaggedMediaResponseDto[];

  @ApiProperty({ description: 'Available times of day' })
  timesOfDay: TimeOfDay[];

  @ApiProperty({ description: 'Available seasons' })
  seasons: Season[];
}
