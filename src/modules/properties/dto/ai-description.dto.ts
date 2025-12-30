import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DescriptionTone } from '@prisma/client';

export class GenerateDescriptionDto {
  @ApiPropertyOptional({
    enum: DescriptionTone,
    description: 'Tone for the generated description',
    example: DescriptionTone.MODERN_PROFESSIONAL,
  })
  @IsOptional()
  @IsEnum(DescriptionTone)
  tone?: DescriptionTone;
}

export class SaveDescriptionDto {
  @ApiProperty({
    description: 'The description text to save',
    example: 'A beautiful property in the heart of the city...',
  })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({
    enum: DescriptionTone,
    description: 'The tone used for this description',
    example: DescriptionTone.MODERN_PROFESSIONAL,
  })
  @IsEnum(DescriptionTone)
  tone: DescriptionTone;
}

export class AiDescriptionResponseDto {
  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Generated description text' })
  description: string;

  @ApiProperty({ enum: DescriptionTone, description: 'Tone used for generation' })
  tone: DescriptionTone;

  @ApiProperty({ description: 'Word count of the generated description' })
  wordCount: number;

  @ApiProperty({ description: 'When the description was generated' })
  generatedAt: Date;
}
