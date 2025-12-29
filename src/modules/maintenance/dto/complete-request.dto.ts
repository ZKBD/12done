import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteRequestDto {
  @ApiPropertyOptional({
    description: 'Notes about the completed work',
    example: 'Replaced washer in faucet and tightened connections. No water damage found.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completionNotes?: string;

  @ApiPropertyOptional({
    description: 'URLs of photos showing the completed work',
    type: [String],
    example: ['https://storage.example.com/after1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completionPhotos?: string[];

  @ApiPropertyOptional({
    description: 'Actual cost of the maintenance work',
    example: 125.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;
}
