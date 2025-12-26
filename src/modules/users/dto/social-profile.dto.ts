import { IsString, IsUrl, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const SUPPORTED_PLATFORMS = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'youtube',
  'tiktok',
  'pinterest',
  'website',
] as const;

export class SocialProfileItemDto {
  @ApiProperty({
    enum: SUPPORTED_PLATFORMS,
    example: 'linkedin',
    description: 'Social media platform',
  })
  @IsString()
  @IsIn(SUPPORTED_PLATFORMS, {
    message: `Platform must be one of: ${SUPPORTED_PLATFORMS.join(', ')}`,
  })
  platform: string;

  @ApiProperty({
    example: 'https://linkedin.com/in/johndoe',
    description: 'Profile URL',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  profileUrl: string;
}

export class UpdateSocialProfilesDto {
  @ApiProperty({
    type: [SocialProfileItemDto],
    description: 'Array of social profiles to set (replaces all existing)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialProfileItemDto)
  profiles: SocialProfileItemDto[];
}

export class SocialProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platform: string;

  @ApiProperty()
  profileUrl: string;

  @ApiProperty()
  createdAt: Date;
}
